export interface CustomerOutlet {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  fssaiLicense: string;
  deliveryRadiusKm: number;
  minimumPrepMinutes: number;
  packingMinutes: number;
  opensAtMinute: number;
  closesAtMinute: number;
  isActive: boolean;
}
export interface CustomerMenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string | null;
  isVeg: boolean;
  allergens: string[];
  spiceLevel: number;
  isAvailable: boolean;
  availableFromMinute?: number | null;
  availableToMinute?: number | null;
  timeRestricted?: boolean;
  serviceHoursText?: string;
  portions: { id: string; name: string; pricePaise: number }[];
  addons: {
    id: string;
    name: string;
    pricePaise: number;
    allergens: string[];
  }[];
}
export interface CustomerMenu {
  outlet: CustomerOutlet;
  items: CustomerMenuItem[];
  isOpen: boolean;
}

export interface AdminCityPrice {
  id: string;
  city: string;
  pricePaise: number;
}

export interface AdminMenuPortion {
  id: string;
  name: string;
  prepMinutesOverride: number | null;
  prices: AdminCityPrice[];
}

export interface AdminOutletAvailability {
  outletId: string;
  isAvailable: boolean;
  outlet?: {
    id: string;
    name: string;
    city: string;
  };
}

export interface AdminMenuItem {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string | null;
  isVeg: boolean;
  spiceLevel: number;
  allergens: string[];
  basePrepMinutes: number;
  prepStation: string;
  batchCapacity: number;
  isActive: boolean;
  availableFromMinute: number | null;
  availableToMinute: number | null;
  portions: AdminMenuPortion[];
  addons: {
    id: string;
    name: string;
    pricePaise: number;
    extraPrepMinutes: number;
    allergens: string[];
  }[];
  availability: AdminOutletAvailability[];
}

export interface AdminOutlet {
  id: string;
  name: string;
  city: string;
  isCloudKitchen?: boolean;
}
