# Expo Router native toolbar badge count

**Tanggal riset:** 2026-09-21  
**Konteks:** `apps/mobile` memakai Expo `~57.0.17`, Expo Router `~57.0.17`,
`NativeTabs` dari `expo-router/unstable-native-tabs`, dan sudah memakai
`Stack.Toolbar` pada beberapa screen.

## Kesimpulan

Bisa. Untuk badge count di native toolbar/header (bukan tab bar), gunakan
`Stack.Toolbar.Badge` sebagai child dari `Stack.Toolbar.Button` di dalam
`<Stack.Toolbar placement="left">` atau `placement="right">`.

Contoh untuk SDK 57:

```tsx
import { Stack } from "expo-router";

export default function InboxScreen() {
  const unreadCount = 5;

  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        icon={require("~/assets/bell.png")}
        onPress={() => {}}
      >
        <Stack.Toolbar.Label>Notifications</Stack.Toolbar.Label>
        {unreadCount > 0 && (
          <Stack.Toolbar.Badge>{String(unreadCount)}</Stack.Toolbar.Badge>
        )}
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}
```

Jika yang dimaksud adalah badge pada icon tab bagian bawah, API-nya berbeda:
gunakan `NativeTabs.Trigger.Badge` (SDK 55–57) atau `Badge` dari
`expo-router/unstable-native-tabs`.

## Batasan dan catatan

- `Stack.Toolbar` adalah API alpha.
- Native toolbar hanya dirender di Android dan iOS; untuk web perlu fallback
  sendiri.
- Badge hanya bekerja pada header placement `left`/`right`, bukan bottom
  toolbar.
- Di Android, `Stack.Toolbar.Button` hanya merender icon dan badge; child
  `Stack.Toolbar.Label` diabaikan. Jika perlu UI label custom di Android,
  gunakan `Stack.Toolbar.View`.
- Toolbar header otomatis membuat header terlihat (`headerShown: true`).
- Untuk Android, `icon` harus berupa `ImageSourcePropType` seperti
  `require("./icon.png")`; gunakan `Stack.Toolbar.Icon` dengan `src` bila
  ingin pola lintas-platform.

## Kesesuaian dengan repo

Repo saat ini sudah mempunyai pemakaian `Stack.Toolbar` di screen mobile,
sehingga penambahan badge secara teknis tidak memerlukan migrasi navigator.
Badge count sebaiknya berasal dari state/query yang reaktif, lalu dirender
hanya saat nilainya lebih besar dari nol. Jika count perlu dipakai di banyak
screen, simpan unread count pada provider/store bersama, bukan state lokal
masing-masing screen.

## Sumber resmi

- [Expo Router: Stack Toolbar](https://docs.expo.dev/router/advanced/stack-toolbar/)
  — API, contoh `Stack.Toolbar.Badge`, platform support, dan limitations.
- [Expo Router: Stack API reference](https://docs.expo.dev/versions/latest/sdk/router/stack/)
  — perilaku placement dan header visibility.
- [Expo Router: Native tabs](https://docs.expo.dev/router/advanced/native-tabs/)
  — API badge yang berbeda untuk tab bar.
- [Expo Router SDK 54 native-tabs API reference](https://docs.expo.dev/versions/v54.0.0/sdk/router-native-tabs/)
  — referensi API native tabs versi sebelum compound component API.
