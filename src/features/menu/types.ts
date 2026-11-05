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
