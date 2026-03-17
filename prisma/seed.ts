import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Fixed IDs so upsell cross-references work ──────────────────────────────
const IDS = {
  LIVRE_STANDARD: 'cb-livre-standard',
  LIVRE_PREMIUM:  'cb-livre-premium',
  JEU_CARTES:     'cb-jeu-cartes',
  PACK_INTIME:    'cb-pack-intime',
}

async function main() {
  console.log('🌱 Démarrage du seed CoupleBook…')

  // ── Reset shop data (keep admin & SiteSettings) ──────────────────────────
  console.log('🧹 Nettoyage des données existantes…')
  await prisma.$transaction([
    prisma.funnelEvent.deleteMany(),
    prisma.emailLog.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.product.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.adminLog.deleteMany(),
  ])
  console.log('✅ Boutique réinitialisée')

  // ── Admin ────────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || 'Admin@1234!',
    12
  )
  const admin = await prisma.admin.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@example.com' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: adminPassword,
      name: 'Administrateur',
    },
  })
  console.log(`✅ Admin : ${admin.email}`)

  // ── Site settings ────────────────────────────────────────────────────────
  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: {
      storeName: 'CoupleBook',
      storeTagline: 'Des questions qui rapprochent les couples',
      primaryColor: '#E8B4B8',
      announceBannerFr: '❤️ Livraison gratuite dès 50 € · Satisfait ou remboursé 30 jours',
      announceBannerEn: '❤️ Free shipping from €50 · 30-day money-back guarantee',
    },
    create: {
      id: 'singleton',
      storeName: 'CoupleBook',
      storeTagline: 'Des questions qui rapprochent les couples',
      primaryColor: '#E8B4B8',
      announceBannerFr: '❤️ Livraison gratuite dès 50 € · Satisfait ou remboursé 30 jours',
      announceBannerEn: '❤️ Free shipping from €50 · 30-day money-back guarantee',
    },
  })
  console.log('✅ SiteSettings mis à jour')

  // ── Products ─────────────────────────────────────────────────────────────
  const products = [
    // ── 1. Livre standard ─────────────────────────────────────────────────
    {
      id: IDS.LIVRE_STANDARD,
      name: 'Livre – Mieux se connaître en couple',
      slug: 'livre-mieux-se-connaitre-en-couple',
      description: `<h2>Un livre conçu pour les couples qui veulent apprendre à mieux se comprendre</h2>
<p>À travers des questions guidées, des exercices et des moments d'échange, ce livre permet d'aborder des sujets importants comme les souvenirs, les valeurs, les projets, les émotions et la communication.</p>
<p>Parfait pour les couples récents comme pour ceux ensemble depuis des années.</p>
<h3>Ce que vous découvrirez ensemble :</h3>
<ul>
  <li>Vos souvenirs et moments fondateurs</li>
  <li>Vos valeurs profondes et vos croyances</li>
  <li>Vos projets et rêves communs</li>
  <li>Votre façon de communiquer et de vous exprimer</li>
  <li>Vos émotions et besoins affectifs</li>
</ul>`,
      shortDesc: "Un livre de questions et d'exercices pour renforcer la communication et la complicité dans le couple.",
      price: 29.90,
      comparePrice: 39.90,
      images: [
        'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&q=80',
        'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80',
      ],
      stock: 999,
      features: [
        '200+ questions guidées pour approfondir votre relation',
        'Exercices pratiques pour chaque section',
        "Espaces d'écriture pour noter vos réponses",
        'Disponible en 5 coloris au choix',
        'Papier premium, couverture souple',
        'Idéal en cadeau (livré dans une pochette)',
      ],
      isActive: true,
      sku: 'CB-LIVRE-STD',
      options: {
        groups: [
          { name: 'Version',  choices: ['Standard', 'Premium', 'Personnalisée', 'Cadeau'] },
          { name: 'Couleur',  choices: ['Rose poudré', 'Beige crème', 'Bleu nuit', 'Vert sauge', 'Noir & or'] },
        ],
      },
      // No upsell on this product — it triggers the Premium upsell (configured below)
      upsellActive: false,
      upsellPrice: null,
      upsellMessage: null,
      upsellSendEmail: false,
      upsellTriggerIds: [],
    },

    // ── 2. Livre Édition Premium ───────────────────────────────────────────
    {
      id: IDS.LIVRE_PREMIUM,
      name: 'Livre Couple – Édition Premium',
      slug: 'livre-couple-edition-premium',
      description: `<h2>L'édition premium du livre couple — pour une expérience plus immersive et durable</h2>
<p>Avec une couverture rigide, un papier de qualité supérieure et des pages bonus exclusives, cette version est idéale pour les couples qui veulent garder une trace précieuse de leur histoire.</p>
<h3>Pages supplémentaires incluses :</h3>
<ul>
  <li>📸 Pages souvenirs avec espace photos</li>
  <li>✍️ Pages projets et rêves communs</li>
  <li>💌 Messages à s'écrire dans le futur</li>
  <li>🌟 Moments inoubliables à immortaliser</li>
  <li>💛 Section "ce que j'aime chez toi"</li>
</ul>
<p>Finitions luxe : couverture rigide, dorure, marque-page intégré.</p>`,
      shortDesc: 'Version luxe du livre couple avec pages bonus, couverture rigide et finition premium.',
      price: 49.90,
      comparePrice: 69.90,
      images: [
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80',
        'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80',
      ],
      stock: 999,
      features: [
        'Couverture rigide finition mat avec dorure',
        '250+ questions + pages bonus exclusives',
        'Papier épais 120g/m², sans acide',
        'Marque-page ruban intégré',
        'Boîte cadeau incluse',
        'Gravure personnalisée disponible sur demande',
      ],
      isActive: true,
      sku: 'CB-LIVRE-PREM',
      options: {
        groups: [
          { name: 'Version', choices: ['Premium rose', 'Premium noir', 'Premium beige', 'Premium personnalisé'] },
          { name: 'Couleur', choices: ['Noir & or', 'Beige & blanc', 'Rose & blanc', 'Bleu nuit & argent'] },
        ],
      },
      // Upsell: proposé aux acheteurs du livre standard
      upsellActive: true,
      upsellPrice: 39.90,
      upsellMessage: 'Offre exclusive : passez à l\'édition Premium à prix réduit — disponible uniquement maintenant.',
      upsellSendEmail: true,
      upsellTriggerIds: [IDS.LIVRE_STANDARD],
    },

    // ── 3. Jeu de cartes ──────────────────────────────────────────────────
    {
      id: IDS.JEU_CARTES,
      name: 'Jeu de cartes – Questions pour couple',
      slug: 'jeu-de-cartes-questions-pour-couple',
      description: `<h2>Un jeu de cartes conçu pour créer des conversations profondes, amusantes et intimes en couple</h2>
<p>Chaque carte contient une question ou un défi pour mieux se découvrir et renforcer votre complicité.</p>
<h3>5 catégories de cartes :</h3>
<ul>
  <li>😄 <strong>Fun</strong> — Des questions légères et amusantes</li>
  <li>💭 <strong>Profond</strong> — Pour aller au fond des choses</li>
  <li>🧡 <strong>Souvenirs</strong> — Revisitez votre histoire ensemble</li>
  <li>🔮 <strong>Futur</strong> — Vos projets et ambitions</li>
  <li>🌶️ <strong>Intime</strong> — Pour les moments à deux</li>
</ul>
<p>Parfait pour les soirées, les voyages ou n'importe quel moment à deux.</p>`,
      shortDesc: 'Jeu de cartes avec 100+ questions fun, profondes et intimes pour renforcer la complicité.',
      price: 19.90,
      comparePrice: 29.90,
      images: [
        'https://images.unsplash.com/photo-1606166325426-7c6b10bc5f49?w=600&q=80',
        'https://images.unsplash.com/photo-1585314540237-13cb82da0c56?w=600&q=80',
      ],
      stock: 999,
      features: [
        '100 cartes questions réparties en 5 catégories',
        'Format compact idéal pour voyager',
        'Cartes plastifiées résistantes',
        'Règles simples, jouez en 5 minutes',
        'Boîte magnétique élégante',
        'Cadeau parfait pour les couples',
      ],
      isActive: true,
      sku: 'CB-JEU-CARTES',
      options: {
        groups: [
          { name: 'Version', choices: ['Classique', 'Intime', 'Fun', 'Profonde', 'Premium'] },
          { name: 'Couleur', choices: ['Rouge & blanc', 'Noir & rouge', 'Beige & or', 'Violet & rose', 'Bleu & blanc'] },
        ],
      },
      upsellActive: false,
      upsellPrice: null,
      upsellMessage: null,
      upsellSendEmail: false,
      upsellTriggerIds: [],
    },

    // ── 4. Pack Couple Intime ─────────────────────────────────────────────
    {
      id: IDS.PACK_INTIME,
      name: 'Pack Couple Intime',
      slug: 'pack-couple-intime',
      description: `<h2>Un pack conçu pour les couples qui veulent explorer leur intimité et renforcer leur connexion</h2>
<p>Ce pack rassemble tout ce dont vous avez besoin pour approfondir votre relation, explorer vos envies et améliorer votre communication intime.</p>
<h3>Contenu du pack :</h3>
<ul>
  <li>📖 Livre de questions intimes (50 questions guidées)</li>
  <li>🃏 Cartes défis couple (30 défis progressifs)</li>
  <li>📝 Carnet fantasmes & désirs (pages à remplir ensemble)</li>
  <li>🗣️ Guide communication intime (exercices pratiques)</li>
</ul>
<p>Idéal pour renforcer la confiance, la complicité et la connexion émotionnelle et physique.</p>`,
      shortDesc: "Pack pour couples avec questions et défis sur l'intimité, la communication et la connexion.",
      price: 59.90,
      comparePrice: 89.90,
      images: [
        'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=600&q=80',
        'https://images.unsplash.com/photo-1527456698-2d7d56e28380?w=600&q=80',
      ],
      stock: 999,
      features: [
        '4 éléments complémentaires dans un coffret',
        'Progression douce de Soft à Premium',
        'Exercices de communication validés par des thérapeutes',
        'Emballage discret et élégant',
        'Guide d\'utilisation inclus',
        'Idéal pour raviver la flamme du couple',
      ],
      isActive: true,
      sku: 'CB-PACK-INTIME',
      options: {
        groups: [
          { name: 'Version', choices: ['Soft', 'Intense', 'Premium'] },
          { name: 'Couleur', choices: ['Noir & rouge', 'Bordeaux', 'Violet', 'Noir & or'] },
        ],
      },
      // Upsell: proposé aux acheteurs du jeu de cartes
      upsellActive: true,
      upsellPrice: 44.90,
      upsellMessage: 'Complétez votre expérience avec le Pack Intime — offre spéciale réservée aux nouveaux clients.',
      upsellSendEmail: true,
      upsellTriggerIds: [IDS.JEU_CARTES],
    },
  ]

  for (const productData of products) {
    const { id, ...rest } = productData
    await prisma.product.upsert({
      where: { id },
      update: rest,
      create: { id, ...rest },
    })
    console.log(`✅ Produit : ${productData.name}`)
  }

  console.log('🎉 Seed CoupleBook terminé avec succès !')
  console.log('')
  console.log('⚠️  Note : 6 articles annoncés mais seulement 4 décrits dans le brief.')
  console.log('    Articles 5 et 6 à définir — créez-les via l\'interface admin.')
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

