INSERT INTO "SiteSettings" (
  id, "storeName", "storeTagline", "aboutContent",
  "primaryColor", "fontFamily", "heroImages",
  "freeShippingThreshold", "shippingRules", "blockedCountries",
  "cgvContent", "faqContent", "deliveryContent",
  "checkoutDistractionFree", "createdAt", "updatedAt"
) VALUES (
  'singleton', 'Boutique', 'Des produits qui font la différence', '',
  '#4f46e5', 'Inter', '{}',
  0, '[]', '{}',
  '', '', '',
  false, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;
