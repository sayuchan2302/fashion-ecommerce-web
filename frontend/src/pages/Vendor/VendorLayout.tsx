import { Store } from 'lucide-react';
import type { ReactNode } from 'react';
import AdminLayout, { type PanelNavItem } from '../Admin/AdminLayout';
import { VENDOR_DICTIONARY } from './vendorDictionary';
import { vendorPanelNav } from '../../config/panelNavigation';

interface VendorLayoutProps {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  hideTopbarTitle?: boolean;
  breadcrumbs?: string[];
}

const t = VENDOR_DICTIONARY.layout;

const vendorNavItems: PanelNavItem[] = vendorPanelNav;

const VendorLayout = ({ title, actions, children, hideTopbarTitle = false, breadcrumbs }: VendorLayoutProps) => {
  return (
    <AdminLayout
      title={title}
      actions={actions}
      hideTopbarTitle={hideTopbarTitle}
      breadcrumbs={breadcrumbs}
      navItems={vendorNavItems}
      logoIcon={<Store size={22} />}
      logoText={t.logo}
      sidebarDescription={t.sidebar.description}
      sidebarCtaLabel={t.sidebar.cta}
      sidebarCtaTo="/vendor/settings"
      searchPlaceholder={t.searchPlaceholder}
      notificationsLabel={t.notifications}
      settingsLabel={t.settings}
    >
      {children}
    </AdminLayout>
  );
};

export default VendorLayout;
