import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { assets } from '../../assets/assets'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'
import { VEHICLE_CATEGORIES } from '../../utils/vehicleCategories'
import { formatLocationsDisplay } from '../../utils/carLocations'

const ManageCars = () => {
  const { isOwner, axios, currency } = useAppContext()
  const { t } = useI18n()
  const navigate = useNavigate()
  const fallbackImage = assets.car_image1

  const [cars, setCars] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    fleetId: '',
    vin: '',
    plate: '',
    status: '',
    branch: '',
    category: '',
  })
  const [applied, setApplied] = useState(filters)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    Object.entries(applied).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    return params.toString()
  }, [applied])

  const fetchOwnerCars = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`/api/owner/cars${query ? `?${query}` : ''}`)
      if (data.success) {
        setCars(data.cars)
        setBranches(data.branches || [])
      } else toast.error(data.message)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const toggleAvailability = async (carId) => {
    try {
      const { data } = await axios.post('/api/owner/toggle-car', { carId })
      if (data.success) {
        toast.success(data.message)
        fetchOwnerCars()
      } else toast.error(data.message)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const deleteCar = async (carId) => {
    if (!window.confirm('Remove this physical vehicle from the fleet?')) return
    try {
      const { data } = await axios.post('/api/owner/delete-car', { carId })
      if (data.success) {
        toast.success(data.message)
        fetchOwnerCars()
      } else toast.error(data.message)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  useEffect(() => {
    if (isOwner) fetchOwnerCars()
  }, [isOwner, query])

  const inputClass = 'border border-borderColor rounded-md px-3 py-2 text-sm w-full outline-none focus:border-primary'

  return (
    <div className='px-4 pt-8 md:px-8 lg:px-10 xl:px-12 md:pt-10 w-full pb-10 min-w-0'>
      <Title title={t('admin.fleet.title')} subTitle={t('admin.fleet.subtitle')} />

      <form
        onSubmit={(e) => { e.preventDefault(); setApplied({ ...filters }) }}
        className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-xl border border-borderColor bg-white p-4"
      >
        <input
          className={inputClass}
          placeholder={t('admin.fleet.searchAll')}
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <input
          className={inputClass}
          placeholder={t('admin.fleet.fleetId')}
          value={filters.fleetId}
          onChange={(e) => setFilters({ ...filters, fleetId: e.target.value })}
        />
        <input
          className={inputClass}
          placeholder={t('admin.fleet.vin')}
          value={filters.vin}
          onChange={(e) => setFilters({ ...filters, vin: e.target.value })}
        />
        <input
          className={inputClass}
          placeholder={t('admin.fleet.plate')}
          value={filters.plate}
          onChange={(e) => setFilters({ ...filters, plate: e.target.value })}
        />
        <select className={inputClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">{t('admin.fleet.allStatuses')}</option>
          <option value="available">Available</option>
          <option value="booked">Rented</option>
          <option value="maintenance">In Maintenance</option>
        </select>
        <select className={inputClass} value={filters.branch} onChange={(e) => setFilters({ ...filters, branch: e.target.value })}>
          <option value="">{t('admin.fleet.allBranches')}</option>
          {branches.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className={inputClass} value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">{t('admin.fleet.allCategories')}</option>
          {VEHICLE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 px-3 py-2 bg-primary text-white text-sm rounded-md">{t('admin.fleet.apply')}</button>
          <button
            type="button"
            onClick={() => {
              const empty = { search: '', fleetId: '', vin: '', plate: '', status: '', branch: '', category: '' }
              setFilters(empty)
              setApplied(empty)
            }}
            className="px-3 py-2 border rounded-md text-sm"
          >
            {t('admin.fleet.clear')}
          </button>
        </div>
      </form>

      <div className='w-full rounded-md overflow-hidden border border-borderColor mt-6 bg-white'>
        {loading ? (
          <p className="p-6 text-gray-400 text-sm">{t('admin.fleet.loading')}</p>
        ) : cars.length === 0 ? (
          <p className="p-6 text-gray-400 text-sm">{t('admin.fleet.none')}</p>
        ) : (
          <div className="table-scroll">
            <table className='w-full border-collapse text-left text-sm text-gray-600 min-w-[900px]'>
              <thead className='text-gray-500 bg-gray-50'>
                <tr>
                  <th className="p-3 font-medium">{t('admin.fleet.fleetId')}</th>
                  <th className="p-3 font-medium">{t('admin.fleet.car')}</th>
                  <th className="p-3 font-medium">{t('admin.fleet.vin')}</th>
                  <th className="p-3 font-medium">{t('admin.fleet.plate')}</th>
                  <th className="p-3 font-medium">{t('admin.fleet.locationsCol')}</th>
                  <th className="p-3 font-medium">{t('admin.fleet.mileage')}</th>
                  <th className="p-3 font-medium">{t('admin.fleet.category')}</th>
                  <th className="p-3 font-medium">{t('admin.fleet.price')}</th>
                  <th className="p-3 font-medium">{t('admin.fleet.status')}</th>
                  <th className="p-3 font-medium">{t('admin.fleet.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {cars.map((car) => (
                  <tr key={car._id} className='border-t border-borderColor'>
                    <td className='p-3 font-mono text-xs text-primary font-semibold'>{car.fleetId || '—'}</td>
                    <td className='p-3'>
                      <div className="flex items-center gap-3">
                        <img src={car.image || fallbackImage} onError={(e) => { e.currentTarget.src = fallbackImage }} alt={`${car.brand} ${car.model}`} className="h-12 w-12 aspect-square rounded-md object-cover" />
                        <div>
                          <p className='font-medium'>{car.brand} {car.model}</p>
                          <p className='text-xs text-gray-500'>{car.year} · {car.seating_capacity} seats</p>
                        </div>
                      </div>
                    </td>
                    <td className='p-3 font-mono text-xs'>{car.vin || '—'}</td>
                    <td className='p-3 font-medium'>{car.licensePlate || '—'}</td>
                    <td className='p-3'>
                      <p className="text-sm">{formatLocationsDisplay(car)}</p>
                      {car.branch ? <p className="text-xs text-gray-400">{car.branch}</p> : null}
                    </td>
                    <td className='p-3'>{car.mileage || 0} km</td>
                    <td className='p-3'>{car.category}</td>
                    <td className='p-3'>{currency}{car.pricePerDay}{t('admin.fleet.perDay')}</td>
                    <td className='p-3'>
                      <span className={`px-2 py-0.5 rounded text-xs ${car.status === 'maintenance' ? 'bg-amber-100 text-amber-800' : car.isAvaliable ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {car.status === 'maintenance' ? 'In Maintenance' : car.isAvaliable ? 'Available' : 'Offline'}
                      </span>
                    </td>
                    <td className='p-3'>
                      <div className='flex items-center gap-2'>
                        <button type="button" onClick={() => navigate(`/owner/edit-car/${car._id}`)} className='text-xs text-primary hover:underline'>{t('admin.common.edit')}</button>
                        <button type="button" onClick={() => toggleAvailability(car._id)} className='text-xs text-gray-500 hover:underline'>{t('admin.fleet.toggle')}</button>
                        <button type="button" onClick={() => deleteCar(car._id)} className='text-xs text-red-500 hover:underline'>{t('admin.common.delete')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default ManageCars
