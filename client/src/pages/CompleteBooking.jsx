import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import toast from 'react-hot-toast'
import axios from 'axios'
import SignaturePad from '../components/SignaturePad'
import { useI18n } from '../i18n/I18nContext'
import { useAppContext } from '../context/AppContext'
import { getErrorMessage } from '../utils/apiError'
import Loader from '../components/Loader'

const STEPS = ['documents', 'payment', 'signature', 'done']

/** Guest completion must not reuse the owner Bearer token */
const guestApi = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL || 'http://localhost:3000',
})

const StepPill = ({ index, label, active, done }) => (
  <div className={`flex items-center gap-2 min-w-[5.5rem] md:min-w-0 shrink-0 md:shrink ${active ? 'opacity-100' : 'opacity-55'}`}>
    <span
      className={`h-7 w-7 shrink-0 rounded-full text-xs font-semibold flex items-center justify-center ${
        done ? 'bg-primary text-white' : active ? 'bg-ink text-white' : 'bg-sand text-muted'
      }`}
    >
      {done ? '✓' : index}
    </span>
    <span className={`text-xs md:text-sm whitespace-nowrap md:truncate ${active ? 'text-ink font-medium' : 'text-muted'}`}>{label}</span>
  </div>
)

const CompleteBooking = () => {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const { t } = useI18n()
  const { currency } = useAppContext()
  const api = guestApi

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [step, setStep] = useState('documents')
  const [identityType, setIdentityType] = useState('national_id')
  const [uploading, setUploading] = useState('')
  const [paymentType, setPaymentType] = useState('deposit')
  const [paying, setPaying] = useState(false)
  const [signature, setSignature] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [signing, setSigning] = useState(false)

  const c = booking?.completion

  const load = async () => {
    try {
      const { data } = await api.get(`/api/booking-completion/${token}`)
      if (!data.success) throw new Error(data.message)
      setBooking(data.booking)
      setError('')
      if (data.booking.status === 'ready_for_pickup' || data.booking.completion?.completedAt) {
        setStep('done')
      } else if (!data.booking.completion?.documentsComplete) {
        setStep('documents')
      } else if (!data.booking.completion?.paymentComplete) {
        setStep('payment')
      } else if (!data.booking.completion?.signatureComplete) {
        setStep('signature')
      } else {
        setStep('done')
      }
      if (data.booking.completion?.identityType) {
        setIdentityType(data.booking.completion.identityType)
      }
    } catch (err) {
      setError(getErrorMessage(err) || t('completion.invalidLink'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [token])

  // Stripe return
  useEffect(() => {
    const paid = searchParams.get('paid')
    const sessionId = searchParams.get('session_id')
    if (!paid || !sessionId || !token) return
    const confirm = async () => {
      try {
        const { data } = await api.post(`/api/booking-completion/${token}/payment/stripe-confirm`, { sessionId })
        if (data.success) {
          setBooking(data.booking)
          toast.success(t('completion.paymentOk'))
          setStep(data.finalized ? 'done' : 'signature')
        }
      } catch (err) {
        toast.error(getErrorMessage(err))
      }
    }
    confirm()
  }, [searchParams, token])

  const uploadDoc = async (docType, file) => {
    if (!file) return
    setUploading(docType)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('docType', docType)
      if (docType === 'identity') form.append('identityType', identityType)
      const { data } = await api.post(`/api/booking-completion/${token}/documents`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (!data.success) throw new Error(data.message)
      setBooking(data.booking)
      toast.success(t('completion.docUploaded'))
      if (data.booking.completion?.documentsComplete) setStep('payment')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setUploading('')
    }
  }

  const handlePay = async () => {
    setPaying(true)
    try {
      const { data } = await api.post(`/api/booking-completion/${token}/payment/create`, { paymentType })
      if (!data.success) throw new Error(data.message)

      if (data.mode === 'stripe' && data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }

      const confirm = await api.post(`/api/booking-completion/${token}/payment/demo-confirm`, { paymentType })
      if (!confirm.data.success) throw new Error(confirm.data.message)
      setBooking(confirm.data.booking)
      toast.success(t('completion.paymentOk'))
      setStep(confirm.data.finalized ? 'done' : 'signature')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setPaying(false)
    }
  }

  const handleSign = async () => {
    if (!signature) {
      toast.error(t('completion.needSignature'))
      return
    }
    if (!agreed) {
      toast.error(t('completion.needAgree'))
      return
    }
    setSigning(true)
    try {
      const { data } = await api.post(`/api/booking-completion/${token}/signature`, {
        signatureDataUrl: signature,
        agreed: true,
      })
      if (!data.success) throw new Error(data.message)
      setBooking(data.booking)
      toast.success(data.message)
      setStep('done')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSigning(false)
    }
  }

  const amountLabel = useMemo(() => {
    if (!c) return ''
    const amt = paymentType === 'deposit' ? c.depositAmount : c.fullAmount
    return `${currency}${amt}`
  }, [c, paymentType, currency])

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader /></div>

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <h1 className="font-display text-3xl text-ink">{t('completion.invalidTitle')}</h1>
        <p className="mt-3 text-muted">{error}</p>
        <Link to="/" className="inline-block mt-8 px-5 py-2.5 rounded-xl bg-primary text-white text-sm">
          {t('completion.backHome')}
        </Link>
      </div>
    )
  }

  const docsDone = c?.documentsComplete
  const payDone = c?.paymentComplete
  const signDone = c?.signatureComplete

  return (
    <div className="min-h-[80vh] bg-light pb-24">
      <div className="bg-ink text-white page-pad py-10 md:py-12">
        <div className="max-w-3xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/50 mb-2">{t('completion.eyebrow')}</p>
          <h1 className="font-display text-3xl md:text-4xl font-medium">{t('completion.title')}</h1>
          <p className="mt-2 text-white/65 text-sm md:text-base break-words">
            {booking.reservationId} · {booking.car?.brand} {booking.car?.model}
          </p>
        </div>
      </div>

      <div className="page-pad -mt-6">
        <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-borderColor bg-white p-4 sm:p-5 shadow-[0_18px_50px_-28px_rgba(22,18,16,0.3)]">
          <div className="flex md:grid md:grid-cols-4 gap-3 md:gap-4 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
            <StepPill index={1} label={t('completion.stepDocs')} active={step === 'documents'} done={docsDone} />
            <StepPill index={2} label={t('completion.stepPay')} active={step === 'payment'} done={payDone} />
            <StepPill index={3} label={t('completion.stepSign')} active={step === 'signature'} done={signDone} />
            <StepPill index={4} label={t('completion.stepDone')} active={step === 'done'} done={step === 'done'} />
          </div>
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-2xl border border-borderColor bg-white p-5 sm:p-8"
        >
          {step === 'documents' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl text-ink">{t('completion.docsTitle')}</h2>
                <p className="text-sm text-muted mt-1">{t('completion.docsHint')}</p>
              </div>

              <div className="rounded-xl border border-borderColor p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{t('completion.license')}</p>
                    <p className="text-xs text-muted">{t('completion.required')}</p>
                  </div>
                  {c?.drivingLicenseUrl && <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-lg">{t('completion.uploaded')}</span>}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={!!uploading}
                  onChange={(e) => uploadDoc('driving_license', e.target.files?.[0])}
                  className="block w-full text-sm text-muted file:mr-3 file:mb-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-white file:cursor-pointer"
                />
              </div>

              <div className="rounded-xl border border-borderColor p-4">
                <p className="text-sm font-medium text-ink mb-3">{t('completion.identity')}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {['national_id', 'passport'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setIdentityType(type)}
                      className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer border transition-colors ${
                        identityType === type ? 'border-primary bg-primary/10 text-primary' : 'border-borderColor text-muted'
                      }`}
                    >
                      {type === 'national_id' ? t('completion.nationalId') : t('completion.passport')}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <p className="text-xs text-muted">{t('completion.requiredOne')}</p>
                  {c?.identityDocumentUrl && <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-lg">{t('completion.uploaded')}</span>}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={!!uploading}
                  onChange={(e) => uploadDoc('identity', e.target.files?.[0])}
                  className="block w-full text-sm text-muted file:mr-3 file:mb-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-white file:cursor-pointer"
                />
              </div>

              {docsDone && (
                <button type="button" onClick={() => setStep('payment')} className="w-full py-3 rounded-xl bg-primary text-white text-sm font-medium cursor-pointer">
                  {t('completion.continuePayment')}
                </button>
              )}
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl text-ink">{t('completion.payTitle')}</h2>
                <p className="text-sm text-muted mt-1">{t('completion.payHint')}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentType('deposit')}
                  className={`text-left rounded-xl border p-4 cursor-pointer transition-colors ${
                    paymentType === 'deposit' ? 'border-primary bg-primary/5' : 'border-borderColor hover:bg-sand/40'
                  }`}
                >
                  <p className="text-sm font-medium text-ink">{t('completion.deposit')}</p>
                  <p className="text-xs text-muted mt-1">{c?.depositPercent}% {t('completion.ofTotal')}</p>
                  <p className="text-xl font-semibold text-primary mt-3">{currency}{c?.depositAmount}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('full')}
                  className={`text-left rounded-xl border p-4 cursor-pointer transition-colors ${
                    paymentType === 'full' ? 'border-primary bg-primary/5' : 'border-borderColor hover:bg-sand/40'
                  }`}
                >
                  <p className="text-sm font-medium text-ink">{t('completion.fullPay')}</p>
                  <p className="text-xs text-muted mt-1">{t('completion.payAllNow')}</p>
                  <p className="text-xl font-semibold text-primary mt-3">{currency}{c?.fullAmount}</p>
                </button>
              </div>

              <div className="rounded-xl bg-light px-4 py-3 text-sm text-muted">
                {t('completion.totalLabel')}: <span className="text-ink font-medium">{currency}{booking.price}</span>
                {c?.paymentMode === 'demo' && (
                  <p className="text-xs mt-1 text-amber-700">{t('completion.demoPayNote')}</p>
                )}
              </div>

              <button
                type="button"
                disabled={paying || payDone}
                onClick={handlePay}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary-dull text-white text-sm font-medium cursor-pointer disabled:opacity-60"
              >
                {payDone ? t('completion.alreadyPaid') : paying ? t('completion.processing') : `${t('completion.payNow')} · ${amountLabel}`}
              </button>

              {payDone && (
                <button type="button" onClick={() => setStep('signature')} className="w-full py-3 rounded-xl border border-borderColor text-sm cursor-pointer">
                  {t('completion.continueSign')}
                </button>
              )}
            </div>
          )}

          {step === 'signature' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl text-ink">{t('completion.signTitle')}</h2>
                <p className="text-sm text-muted mt-1">{t('completion.signHint')}</p>
              </div>

              <SignaturePad onChange={setSignature} disabled={signing || signDone} />

              <label className="flex items-start gap-3 text-sm text-muted cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
                <span>{t('completion.agreeTerms')}</span>
              </label>

              <button
                type="button"
                disabled={signing || signDone}
                onClick={handleSign}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary-dull text-white text-sm font-medium cursor-pointer disabled:opacity-60"
              >
                {signDone ? t('completion.signed') : signing ? t('completion.processing') : t('completion.signSubmit')}
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700 text-2xl">✓</div>
              <h2 className="font-display text-3xl text-ink">{t('completion.readyTitle')}</h2>
              <p className="mt-2 text-muted text-sm max-w-md mx-auto">{t('completion.readyHint')}</p>

              <div className="mt-8 text-left rounded-xl border border-borderColor p-4 space-y-2 text-sm text-gray-600">
                <p><span className="font-medium text-ink">{t('confirmation.reference')}:</span> {booking.reservationId}</p>
                <p><span className="font-medium text-ink">{t('confirmation.vehicle')}:</span> {booking.car?.brand} {booking.car?.model}</p>
                <p><span className="font-medium text-ink">{t('confirmation.pickup')}:</span> {booking.pickupLocation}</p>
                <p><span className="font-medium text-ink">{t('confirmation.from')}:</span> {new Date(booking.pickupDate).toLocaleString()}</p>
                <p><span className="font-medium text-ink">{t('confirmation.total')}:</span> {currency}{booking.price}</p>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                {c?.contractPdfUrl && (
                  <a href={c.contractPdfUrl} target="_blank" rel="noreferrer" className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm">
                    {t('completion.downloadContract')}
                  </a>
                )}
                {c?.invoicePdfUrl && (
                  <a href={c.invoicePdfUrl} target="_blank" rel="noreferrer" className="px-5 py-2.5 rounded-xl border border-borderColor text-sm">
                    {t('completion.downloadInvoice')}
                  </a>
                )}
              </div>

              <Link to="/" className="inline-block mt-8 text-sm text-primary hover:underline">{t('completion.backHome')}</Link>
            </div>
          )}
        </motion.div>

        {(step === 'payment' || step === 'signature') && (
          <button
            type="button"
            onClick={() => setStep(step === 'signature' ? 'payment' : 'documents')}
            className="mt-4 text-sm text-muted hover:text-ink cursor-pointer"
          >
            ← {t('completion.back')}
          </button>
        )}
        </div>
      </div>
    </div>
  )
}

export default CompleteBooking
