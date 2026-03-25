import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { SessionFeedbackListener } from '@/components/auth/session-feedback-listener'
import { routing } from '@/lib/i18n/routing'
import { getMessages } from '@/lib/i18n/getMessages'

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  const messages = await getMessages(locale)

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <SessionFeedbackListener />
      {children}
    </NextIntlClientProvider>
  )
}
