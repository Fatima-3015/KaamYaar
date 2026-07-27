import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

// Fix default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

const PAKISTAN_CENTER = [30.3753, 69.3451]

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
    }
  })
  return position ? <Marker position={position} /> : null
}

function LocationPicker({ onLocationSelect, initialPosition }) {
  const [position, setPosition] = useState(initialPosition || null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [address, setAddress] = useState('')

  useEffect(() => {
    if (position) {
      onLocationSelect({ lat: position[0], lng: position[1], address })
      fetchAddress(position[0], position[1])
    }
  }, [position])

  const fetchAddress = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      setAddress(data.display_name || '')
    } catch (err) {
      console.error('Failed to fetch address:', err)
    }
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude])
        setGettingLocation(false)
      },
      () => {
        alert('Unable to get your location. Please select on the map instead.')
        setGettingLocation(false)
      }
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={gettingLocation}
        className="w-full mb-2 bg-amber-800 text-white text-sm font-semibold py-2 rounded-lg hover:bg-amber-900 transition disabled:opacity-50"
      >
        {gettingLocation ? 'Detecting location...' : '📍 Use My Current Location'}
      </button>

      <p className="text-xs text-gray-500 mb-2">Or tap on the map to select a location</p>

      <div className="rounded-lg overflow-hidden border border-gray-300" style={{ height: '250px' }}>
        <MapContainer
          center={position || PAKISTAN_CENTER}
          zoom={position ? 13 : 5}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>
      </div>

      {address && (
        <p className="text-xs text-gray-600 mt-2">📍 {address}</p>
      )}
    </div>
  )
}

export default LocationPicker