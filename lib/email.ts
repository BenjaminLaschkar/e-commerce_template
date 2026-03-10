import nodemailer from 'nodemailer'
import { prisma } from './prisma'
import { logger } from './logger'

// ============================================
// CONFIGURATION SMTP
// ============================================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'ssl0.ovh.net',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const FROM = `"${process.env.EMAIL_FROM_NAME || 'Boutique'}" <${process.env.EMAIL_FROM}>`
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ============================================
// UTILITAIRE D'ENVOI
// ============================================
async function sendEmail({
  to,
  subject,
  html,
  customerId,
  orderId,
  type,
}: {
  to: string
  subject: string
  html: string
  customerId?: string
  orderId?: string
  type: string
}) {
  try {
    await transporter.sendMail({
      from: FROM,
      to,
      subject,
      html,
    })

    await prisma.emailLog.create({
      data: {
        to,
        subject,
        type: type as any,
        status: 'sent',
        customerId,
        orderId,
      },
    })

    logger.info('api', `Email envoyé [${type}]`, { type, to })
    return true
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    logger.error('error', `Erreur email [${type}]`, { type, to, error: errMsg })

    await prisma.emailLog.create({
      data: {
        to,
        subject,
        type: type as any,
        status: 'error',
        error: errMsg,
        customerId,
        orderId,
      },
    })

    return false
  }
}

// ============================================
// TEMPLATE HELPERS
// ============================================

/** Load a custom template from DB. Returns null if not found. */
async function getEmailTemplate(type: string) {
  try {
    return await prisma.emailTemplate.findUnique({ where: { id: type } })
  } catch {
    return null
  }
}

/** Replace {variable} placeholders in a template string */
function renderVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}

// ============================================
// TEMPLATES HTML
// ============================================
function baseTemplate(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; }
  .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px; text-align: center; }
  .header h1 { color: #fff; font-size: 24px; font-weight: 700; }
  .header p { color: #94a3b8; margin-top: 8px; font-size: 14px; }
  .body { padding: 40px 32px; }
  .body p { color: #475569; line-height: 1.6; margin-bottom: 16px; }
  .cta-button { display: inline-block; background: #6366f1; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 24px 0; }
  .order-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
  .order-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
  .order-row:last-child { border-bottom: none; font-weight: 700; font-size: 16px; color: #1e293b; }
  .badge { display: inline-block; background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
  .footer { background: #f8fafc; padding: 24px 32px; text-align: center; }
  .footer p { color: #94a3b8; font-size: 12px; line-height: 1.5; }
  .footer a { color: #6366f1; text-decoration: none; }
  .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🛍️ ${process.env.EMAIL_FROM_NAME || 'Votre Boutique'}</h1>
  </div>
  <div class="body">
    ${content}
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} ${process.env.EMAIL_FROM_NAME || 'Boutique'}. Tous droits réservés.</p>
    <p>Si vous ne souhaitez plus recevoir nos emails, <a href="${APP_URL}/unsubscribe">cliquez ici</a>.</p>
  </div>
</div>
</body>
</html>`
}

// ============================================
// EMAILS COMMANDES
// ============================================
export async function sendOrderConfirmation(order: {
  id: string
  orderNumber: string
  customer: { email: string; firstName?: string | null }
  items: Array<{ name: string; quantity: number; price: number }>
  total: number
}) {
  const tpl = await getEmailTemplate('ORDER_CONFIRMATION')

  const vars = {
    firstName: order.customer.firstName || 'cher client',
    orderNumber: order.orderNumber,
    total: order.total.toFixed(2) + ' €',
  }

  const itemsHtml = order.items
    .map(
      (item) => `
    <div class="order-row">
      <span>${item.name} × ${item.quantity}</span>
      <span>${(item.price * item.quantity).toFixed(2)} €</span>
    </div>`
    )
    .join('')

  const defaultBody = `
    <div class="badge">✅ Commande confirmée</div>
    <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Merci pour votre commande !</h2>
    <p>Bonjour ${vars.firstName},</p>
    <p>Votre commande <strong>#${order.orderNumber}</strong> a bien été reçue et est en cours de traitement.</p>
    
    <div class="order-box">
      ${itemsHtml}
      <div class="order-row">
        <span>Total</span>
        <span>${order.total.toFixed(2)} €</span>
      </div>
    </div>
    
    <p>Vous recevrez un email de confirmation dès l'expédition de votre commande.</p>
    
    <div style="text-align: center;">
      <a href="${APP_URL}/confirmation?order=${order.orderNumber}" class="cta-button">Voir ma commande →</a>
    </div>
  `

  const body = tpl?.bodyFr ? renderVars(tpl.bodyFr, { ...vars, items: itemsHtml }) : defaultBody
  const subject = tpl?.subjectFr
    ? renderVars(tpl.subjectFr, vars)
    : `✅ Commande confirmée #${order.orderNumber}`

  const html = baseTemplate(body, 'Confirmation de commande')

  return sendEmail({
    to: order.customer.email,
    subject,
    html,
    customerId: undefined,
    orderId: order.id,
    type: 'ORDER_CONFIRMATION',
  })
}

export async function sendOrderShipped(order: {
  id: string
  orderNumber: string
  customer: { email: string; firstName?: string | null }
  trackingNumber?: string | null
}) {
  const tpl = await getEmailTemplate('ORDER_SHIPPED')
  const vars = {
    firstName: order.customer.firstName || 'cher client',
    orderNumber: order.orderNumber,
    trackingNumber: order.trackingNumber || '',
  }

  const defaultBody = `
    <div class="badge" style="background: #dbeafe; color: #1d4ed8;">📦 Expédiée</div>
    <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Votre commande est en route !</h2>
    <p>Bonjour ${vars.firstName},</p>
    <p>Votre commande <strong>#${order.orderNumber}</strong> a été expédiée et est en route vers vous.</p>
    ${order.trackingNumber ? `<div class="order-box"><p style="margin: 0;"><strong>Numéro de suivi :</strong> ${order.trackingNumber}</p></div>` : ''}
    <p>Vous devriez recevoir votre colis dans les prochains jours ouvrés.</p>
    <div style="text-align: center;"><a href="${APP_URL}/confirmation?order=${order.orderNumber}" class="cta-button">Suivre ma commande →</a></div>
  `

  const body = tpl?.bodyFr ? renderVars(tpl.bodyFr, vars) : defaultBody
  const subject = tpl?.subjectFr
    ? renderVars(tpl.subjectFr, vars)
    : `📦 Votre commande #${order.orderNumber} est expédiée !`

  const html = baseTemplate(body, 'Commande expédiée')
  return sendEmail({ to: order.customer.email, subject, html, orderId: order.id, type: 'ORDER_SHIPPED' })
}

export async function sendOrderDelivered(order: {
  id: string
  orderNumber: string
  customer: { email: string; firstName?: string | null }
}) {
  const tpl = await getEmailTemplate('ORDER_DELIVERED')
  const vars = { firstName: order.customer.firstName || 'cher client', orderNumber: order.orderNumber }

  const defaultBody = `
    <div class="badge" style="background: #dcfce7; color: #15803d;">✅ Livrée</div>
    <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Votre colis est arrivé !</h2>
    <p>Bonjour ${vars.firstName},</p>
    <p>Votre commande <strong>#${order.orderNumber}</strong> a été livrée avec succès.</p>
    <p>Nous espérons que vous êtes satisfait(e) de votre achat. N'hésitez pas à nous laisser un avis !</p>
    <div style="text-align: center;"><a href="${APP_URL}" class="cta-button">🛍️ Continuer mes achats</a></div>
  `

  const body = tpl?.bodyFr ? renderVars(tpl.bodyFr, vars) : defaultBody
  const subject = tpl?.subjectFr
    ? renderVars(tpl.subjectFr, vars)
    : `✅ Votre commande #${order.orderNumber} a été livrée !`

  const html = baseTemplate(body, 'Commande livrée')
  return sendEmail({ to: order.customer.email, subject, html, orderId: order.id, type: 'ORDER_DELIVERED' })
}

// ============================================
// EMAILS ABANDON PANIER
// ============================================
export async function sendAbandonCart1(cart: {
  id: string
  customer: { id: string; email: string; firstName?: string | null }
  items: Array<{ product: { name: string; price: number; images: string[] }; quantity: number }>
}) {
  const total = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const tpl = await getEmailTemplate('CART_ABANDON_1')
  const vars = { firstName: cart.customer.firstName || 'cher client', total: total.toFixed(2) + ' €' }
  const itemsHtml = cart.items.map((item) =>
    `<div class="order-row"><span>${item.product.name} × ${item.quantity}</span><span>${(item.product.price * item.quantity).toFixed(2)} €</span></div>`
  ).join('')

  const defaultBody = `
    <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Vous avez oublié quelque chose... 🛒</h2>
    <p>Bonjour ${vars.firstName},</p>
    <p>Vous avez laissé des articles dans votre panier. Votre sélection vous attend !</p>
    <div class="order-box">${itemsHtml}<div class="order-row"><span>Total</span><span>${total.toFixed(2)} €</span></div></div>
    <p>⚡ Stock limité — ne tardez pas trop !</p>
    <div style="text-align: center;"><a href="${APP_URL}/cart" class="cta-button">Reprendre mon panier →</a></div>
  `

  const body = tpl?.bodyFr ? renderVars(tpl.bodyFr, { ...vars, items: itemsHtml }) : defaultBody
  const subject = tpl?.subjectFr
    ? renderVars(tpl.subjectFr, vars)
    : `🛒 Vous avez oublié votre panier (${total.toFixed(2)} €)`

  const html = baseTemplate(body, 'Votre panier vous attend')
  return sendEmail({ to: cart.customer.email, subject, html, customerId: cart.customer.id, type: 'CART_ABANDON_1' })
}

export async function sendAbandonCart2(cart: {
  id: string
  customer: { id: string; email: string; firstName?: string | null }
  items: Array<{ product: { name: string; price: number; images: string[] }; quantity: number }>
}) {
  const total = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const tpl = await getEmailTemplate('CART_ABANDON_2')
  const vars = { firstName: cart.customer.firstName || 'cher client', total: total.toFixed(2) + ' €' }
  const itemsHtml = cart.items.map((item) =>
    `<div class="order-row"><span>${item.product.name} × ${item.quantity}</span><span>${(item.product.price * item.quantity).toFixed(2)} €</span></div>`
  ).join('')

  const defaultBody = `
    <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Dernière chance ! 🔥</h2>
    <p>Bonjour ${vars.firstName},</p>
    <p>Votre panier est toujours disponible, mais les stocks sont limités.</p>
    <div class="order-box">${itemsHtml}<div class="order-row"><span>Total</span><span>${total.toFixed(2)} €</span></div></div>
    <p>💡 <strong>Offre spéciale :</strong> Commandez maintenant et bénéficiez de nos garanties :</p>
    <ul style="color: #475569; margin: 12px 0 12px 20px; line-height: 1.8;"><li>✅ Paiement 100% sécurisé</li><li>✅ Satisfaction garantie</li><li>✅ Support client réactif</li></ul>
    <div style="text-align: center;"><a href="${APP_URL}/cart" class="cta-button">🛒 Finaliser ma commande</a></div>
  `

  const body = tpl?.bodyFr ? renderVars(tpl.bodyFr, { ...vars, items: itemsHtml }) : defaultBody
  const subject = tpl?.subjectFr
    ? renderVars(tpl.subjectFr, vars)
    : `🔥 Dernière chance — votre panier expire bientôt`

  const html = baseTemplate(body, 'Dernière chance pour votre panier')
  return sendEmail({ to: cart.customer.email, subject, html, customerId: cart.customer.id, type: 'CART_ABANDON_2' })
}

// ============================================
// EMAIL CAMPAGNE
// ============================================
export async function sendCampaign({
  to,
  subject,
  content,
  customerId,
}: {
  to: string
  subject: string
  content: string
  customerId?: string
}) {
  const html = baseTemplate(content, subject)
  return sendEmail({ to, subject, html, customerId, type: 'CAMPAIGN' })
}

// ============================================
// AUTOMATION PANIER ABANDONNÉ
// ============================================
export async function processAbandonedCarts() {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Email 1 — abandon après 1h
  const carts1h = await prisma.cart.findMany({
    where: {
      isAbandoned: true,
      abandonEmail1Sent: false,
      updatedAt: { lte: oneHourAgo },
      customerId: { not: null },
    },
    include: {
      customer: true,
      items: { include: { product: true } },
    },
  })

  for (const cart of carts1h) {
    if (!cart.customer || cart.items.length === 0) continue
    await sendAbandonCart1({
      id: cart.id,
      customer: cart.customer,
      items: cart.items,
    })
    await prisma.cart.update({
      where: { id: cart.id },
      data: { abandonEmail1Sent: true },
    })
  }

  // Email 2 — abandon après 24h
  const carts24h = await prisma.cart.findMany({
    where: {
      isAbandoned: true,
      abandonEmail1Sent: true,
      abandonEmail2Sent: false,
      updatedAt: { lte: twentyFourHoursAgo },
      customerId: { not: null },
    },
    include: {
      customer: true,
      items: { include: { product: true } },
    },
  })

  for (const cart of carts24h) {
    if (!cart.customer || cart.items.length === 0) continue
    await sendAbandonCart2({
      id: cart.id,
      customer: cart.customer,
      items: cart.items,
    })
    await prisma.cart.update({
      where: { id: cart.id },
      data: { abandonEmail2Sent: true },
    })
  }

  console.log(
    `📧 Automation panier: ${carts1h.length} email(s) J+1h, ${carts24h.length} email(s) J+24h envoyé(s)`
  )

  return {
    email1Sent: carts1h.length,
    email2Sent: carts24h.length,
  }
}
