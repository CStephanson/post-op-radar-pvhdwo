// Initialize Natively console log capture before anything else
import './utils/errorLogger';

// Entry point for React Navigation
import { registerRootComponent } from 'expo';
import RootLayout from './app/_layout';

registerRootComponent(RootLayout);
