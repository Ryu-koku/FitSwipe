import { Stack } from 'expo-router';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../context';

export default function Layout() {
  return <AppProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false }} /></AppProvider>;
}
