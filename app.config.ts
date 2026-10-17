import type { ConfigContext, ExpoConfig } from 'expo/config';

// Asosiy sozlamalar app.json'da. Bu yerda faqat ishlab chiqish build'i ajratiladi: u boshqa paket nomi bilan
// alohida ilova bo'lib o'rnatiladi va kundalik ishlatiladigan DocBuilder'ni (hujjatlari bilan) almashtirmaydi.
const IS_DEV = process.env.APP_VARIANT === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? 'DocBuilder Dev' : 'DocBuilder',
  slug: config.slug ?? 'docbuilder',
  android: {
    ...config.android,
    package: IS_DEV ? 'uz.docbuilder.app.dev' : 'uz.docbuilder.app',
  },
});
