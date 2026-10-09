import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DB_NAME } from '../db/schema';
import { initDatabase } from '../db/database';
import { colors } from '../constants/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <SQLiteProvider databaseName={DB_NAME} onInit={initDatabase}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="product/[id]"
            options={{
              title: 'Product Details',
              headerBackTitle: 'Back',
            }}
          />
        </Stack>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
