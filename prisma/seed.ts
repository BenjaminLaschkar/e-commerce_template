import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Démarrage du seed...')

  // Créer admin
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
  console.log(`✅ Admin créé: ${admin.email}`)

  // Créer des produits de démonstration
  const products = [
    {
      name: 'Formation Marketing Digital - Pack Complet',
      slug: 'formation-marketing-digital-pack-complet',
      description: `<h2>Maîtrisez le Marketing Digital en 30 jours</h2>
<p>Cette formation complète vous donnera toutes les clés pour réussir dans le marketing digital.</p>
<h3>Ce que vous allez apprendre :</h3>
<ul>
  <li>Les fondamentaux du marketing digital</li>
  <li>SEO et référencement naturel</li>
  <li>Publicité payante (Google Ads, Meta Ads)</li>
  <li>Email marketing et automation</li>
  <li>Analyse et optimisation des conversions</li>
</ul>
<h3>Bonus inclus :</h3>
<ul>
  <li>Accès à vie aux mises à jour</li>
  <li>Communauté privée</li>
  <li>Templates et ressources</li>
</ul>`,
      shortDesc: 'Formation complète pour maîtriser le marketing digital et booster vos conversions.',
      price: 297,
      comparePrice: 497,
      images: ['/uploads/product-1.jpg'],
      stock: 999,
      isActive: true,
      sku: 'FORM-MKT-001',
    },
    {
      name: 'Template Landing Page Haute Conversion',
      slug: 'template-landing-page-haute-conversion',
      description: `<h2>Template professionnel pour vos landing pages</h2>
<p>Augmentez vos conversions avec ce template optimisé par des experts marketing.</p>
<h3>Caractéristiques :</h3>
<ul>
  <li>Design moderne et professionnel</li>
  <li>Optimisé mobile-first</li>
  <li>A/B testing intégré</li>
  <li>Compatible tous CMS</li>
</ul>`,
      shortDesc: 'Template landing page optimisé conversion, compatible tous CMS.',
      price: 97,
      comparePrice: 197,
      images: ['/uploads/product-2.jpg'],
      stock: 999,
      isActive: true,
      sku: 'TMPL-LP-002',
    },
  ]

  for (const productData of products) {
    const product = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {},
      create: productData,
    })
    console.log(`✅ Produit créé: ${product.name}`)
  }

  console.log('🎉 Seed terminé avec succès!')
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
