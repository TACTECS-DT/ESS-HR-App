/**
 * ESS HR App — Root component
 * Wires: Redux store, React Query, i18n, Navigation, Mock API
 */




import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {Provider as ReduxProvider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

import {store, persistor} from './src/store';
import {setupMocks} from './src/api/mockSetup';
import {setupInterceptors} from './src/api/setupInterceptors';
import './src/i18n'; // Initialize i18n

import AppNavigator from './src/AppNavigator';
import {navigationRef} from './src/navigation/navigationRef';

// Initialize mock API and Axios interceptors once
setupMocks();
setupInterceptors();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

export default function App() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <PersistGate persistor={persistor} loading={null}>
            <QueryClientProvider client={queryClient}>
              <NavigationContainer ref={navigationRef}>
                <AppNavigator />
              </NavigationContainer>
            </QueryClientProvider>
          </PersistGate>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
