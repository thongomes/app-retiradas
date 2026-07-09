export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeolocationResult {
  coordinates: Coordinates | null;
  address: string;
}

export function getCurrentCoordinates(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não é suportada por este navegador.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
    );
    if (!response.ok) {
      throw new Error('Falha ao obter endereço do OpenStreetMap');
    }
    const data = await response.json();
    if (data && data.address) {
      const road = data.address.road || '';
      const houseNumber = data.address.house_number || '';
      const suburb = data.address.suburb || data.address.neighbourhood || '';
      const city = data.address.city || data.address.town || data.address.village || '';

      const formattedAddress = [road, houseNumber, suburb, city]
        .filter(Boolean)
        .join(', ');

      return formattedAddress;
    }
    return '';
  } catch (error) {
    console.warn('Erro no reverse geocoding:', error);
    return '';
  }
}
