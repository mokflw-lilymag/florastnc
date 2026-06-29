/** English category trees — international master seed & settings defaults */

import type { CategoryData } from "@/lib/category-defaults";

export const DEFAULT_PRODUCT_CATEGORIES_EN: CategoryData = {
  main: [
    "Bouquet",
    "Basket",
    "Plants / Pots",
    "Funeral & Events",
    "Seasonal",
    "Gift Sets",
    "Orchids",
    "Wedding",
    "Floral",
    "Plants",
    "Vases & Containers",
    "Supplies",
    "Materials",
    "Other",
  ],
  mid: {
    Bouquet: ["Standard", "Large", "Single stem", "Premium", "Essential"],
    Basket: ["S", "M", "L", "Mixed", "Handle", "Gift basket"],
    "Plants / Pots": ["Air-purifying", "Foliage", "Succulent", "Orchid", "Opening gift", "Hanging"],
    "Funeral & Events": ["Congrats wreath", "Sympathy wreath", "Standing spray", "3-tier congrats", "3-tier sympathy"],
    Seasonal: ["Mother's Day", "Valentine", "Christmas", "Holiday"],
    "Gift Sets": ["Gift box", "Flower box", "Cash bouquet"],
    Orchids: ["Phalaenopsis", "Cymbidium", "Mini orchid"],
    Wedding: ["Bridal bouquet", "Boutonniere", "Ceremony"],
    Floral: ["Wreath", "Bouquet", "Basket", "Centerpiece", "Event flowers"],
    Plants: ["Large", "Medium", "Small", "Orchid"],
    "Vases & Containers": ["Glass", "Ceramic", "Basket", "Vase"],
    Supplies: ["Wrapping", "Ribbon", "Box", "Other"],
    Materials: ["Dry goods", "Containers", "Packaging", "Basket"],
    Other: ["Wreath", "Misc"],
  },
};

export const DEFAULT_MATERIAL_CATEGORIES_EN: CategoryData = {
  main: [
    "Fresh cut",
    "Silk",
    "Preserved",
    "Plants",
    "Baskets / Containers",
    "Consumables",
    "Supplies",
    "Packaging",
    "Ribbon",
    "Other",
  ],
  mid: {
    "Fresh cut": ["Roses", "Gerbera", "Lisianthus", "Tulips", "Carnations", "Chrysanthemum", "Filler", "Line", "Form", "Greens", "Branches", "Other"],
    Plants: ["Succulent", "Small foliage", "Medium foliage", "Large foliage", "Orchid", "Other"],
    Supplies: ["Containers", "Ceramic", "Glass", "Silk", "Accessories"],
    "Baskets / Containers": ["Ceramic", "Terrazzo", "Basket", "Glass", "Cement"],
    Consumables: ["Ribbon / Tex", "Garden supplies", "Packaging", "Decor", "Other"],
    Silk: ["Greens", "Trees"],
    Preserved: ["Form flowers"],
    Packaging: ["Wrap", "Ribbon", "Tex", "Non-woven", "Film"],
    Ribbon: ["Wide ribbon", "Narrow ribbon", "Tex"],
    Other: ["Garden supplies", "Delivery gear", "Other"],
  },
};

export const DEFAULT_EXPENSE_CATEGORIES_EN: CategoryData = {
  main: [
    "Materials",
    "Fixed costs",
    "Utilities",
    "Shipping",
    "Office",
    "Marketing",
    "Meals",
    "Maintenance",
    "Insurance",
    "Other",
  ],
  mid: {
    Materials: ["Fresh", "Silk", "Preserved", "Plants", "Containers", "Consumables", "Outsource", "Requests"],
    "Fixed costs": ["Rent", "Management fee", "Parking", "Security", "Payroll", "Licenses"],
    Utilities: ["Electric", "Gas", "Water", "Internet", "Phone", "Waste"],
    Shipping: ["Delivery fee", "Taxi", "Fuel", "Parking", "Tolls"],
    Office: ["Stationery", "Cleaning", "Equipment", "Supplies"],
    Marketing: ["Ads", "Promo", "Events", "Social", "Print"],
    Meals: ["Staff meals", "Team dinner", "Special", "Coffee / drinks"],
    Maintenance: ["Equipment", "HVAC", "Cooler", "Plumbing", "Electrical"],
    Insurance: ["Business", "Delivery", "Liability", "Property", "Social insurance"],
    Other: ["General", "Misc"],
  },
};
