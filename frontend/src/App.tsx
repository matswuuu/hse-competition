import {Navigate, Route, Routes} from 'react-router'
import Layout from '@/components/Layout'
import HomePage from '@/pages/HomePage'
import LegalPage from '@/pages/LegalPage'
import LoginPage from '@/pages/LoginPage'
import NotFoundPage from '@/pages/NotFoundPage'
import PhotoPage from '@/pages/PhotoPage'
import DataPage from '@/pages/profile/DataPage'
import OverviewPage from '@/pages/profile/OverviewPage'
import PlanPage from '@/pages/profile/PlanPage'
import ProfileLayout from '@/pages/profile/ProfileLayout'
import SettingsPage from '@/pages/profile/SettingsPage'
import ShoppingPage, {FridgeTab, ShoppingListTab, SpendingTab} from '@/pages/profile/ShoppingPage'
import RegisterPage from '@/pages/RegisterPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="profile" element={<ProfileLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="plan" element={<PlanPage />} />
          <Route path="shopping" element={<ShoppingPage />}>
            <Route index element={<ShoppingListTab />} />
            <Route path="fridge" element={<FridgeTab />} />
            <Route path="spending" element={<SpendingTab />} />
          </Route>
          <Route path="data" element={<DataPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="settings" element={<Navigate to="/profile/settings" replace />} />
        <Route path="photo" element={<PhotoPage />} />
        <Route path="terms" element={<LegalPage page="terms" />} />
        <Route path="privacy" element={<LegalPage page="privacy" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
