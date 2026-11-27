/**
 * FoodBundles server.food.rw API client for restaurant lookup.
 */

const FOODBUNDLES_BASE_URL = 'https://server.food.rw';

export interface RestaurantLookupResult {
  id: string;
  name: string;
  email: string;
  tin: string | null;
  phone: string | null;
  role: string;
}

export interface UserLookupResponse {
  success: boolean;
  data: {
    id: string;
    name?: string;
    email?: string;
    tin?: string;
    phone?: string;
    role?: string;
    userType: 'farmer' | 'restaurant' | 'admin' | 'hotel' | 'aggregator' | 'logistics' | 'trader';
  };
}

/**
 * Look up a user by email from FoodBundles backend.
 * Public endpoint, no authentication required.
 */
export async function lookupUserByEmail(email: string): Promise<UserLookupResponse> {
  const response = await fetch(`${FOODBUNDLES_BASE_URL}/users/email/${encodeURIComponent(email)}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('USER_NOT_FOUND');
    }
    throw new Error('LOOKUP_FAILED');
  }

  return response.json() as Promise<UserLookupResponse>;
}

/**
 * Check if a user lookup result is a restaurant.
 */
export function isRestaurantUser(user: UserLookupResponse['data']): boolean {
  return user.userType === 'restaurant' || user.userType === 'hotel';
}

/**
 * Extract restaurant data from lookup result.
 */
export function toRestaurantData(user: UserLookupResponse['data']): RestaurantLookupResult | null {
  if (!isRestaurantUser(user)) return null;
  return {
    id: user.id,
    name: user.name ?? '',
    email: user.email ?? '',
    tin: user.tin ?? null,
    phone: user.phone ?? null,
    role: user.role ?? user.userType.toUpperCase(),
  };
}
