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

    // Safety timeout of 6 seconds: if browser hangs (common in iOS), reject the promise.
    const safetyTimeout = setTimeout(() => {
      reject(new Error('Timeout de segurança da Geolocalização (6s).'));
    }, 6000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(safetyTimeout);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        clearTimeout(safetyTimeout);
        // Fallback: If it failed, try once more with enableHighAccuracy: false
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          },
          (err) => {
            reject(err);
          },
          { enableHighAccuracy: false, timeout: 4000 }
        );
      },
      // Using enableHighAccuracy: false by default since technicians work indoors,
      // where satellite GPS often fails/times out, and network location is instant.
      { enableHighAccuracy: false, timeout: 4000 }
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
