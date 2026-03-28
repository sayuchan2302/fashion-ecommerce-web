import './Vendor.css';
import { useEffect, useMemo, useState } from 'react';
import { Calendar, Download, Link2, Package, Percent, ShoppingCart, TrendingUp } from 'lucide-react';
import VendorLayout from './VendorLayout';
import { formatCurrency } from '../../services/commissionService';
import { vendorPortalService } from '../../services/vendorPortalService';
import { useToast } from '../../contexts/ToastContext';
import { getUiErrorMessage } from '../../utils/errorMessage';
import { AdminStateBlock } from '../Admin/AdminStateBlocks';
import { copyTextToClipboard } from './vendorHelpers';

type Period = 'today' | 'week' | 'month';

interface AnalyticsData {
  periods: Record<
    Period,
    {
      revenue: number;
      payout: number;
      commission: number;
      orders: number;
      avgOrderValue: number;
      conversionRate: number;
      previousRevenue: number;
      previousPayout: number;
      previousCommission: number;
      previousOrders: number;
    }
  >;
  dailyData: Array<{ date: string; revenue: number; payout: number; commission: number; orders: number }>;
  topProducts: Array<{ id: string; name: string; sales: number; revenue: number; img: string }>;
  commissionRate: number;
}

const emptyAnalytics: AnalyticsData = {
  periods: {
    today: { revenue: 0, payout: 0, commission: 0, orders: 0, avgOrderValue: 0, conversionRate: 0, previousRevenue: 1, previousPayout: 1, previousCommission: 1, previousOrders: 1 },
    week: { revenue: 0, payout: 0, commission: 0, orders: 0, avgOrderValue: 0, conversionRate: 0, previousRevenue: 1, previousPayout: 1, previousCommission: 1, previousOrders: 1 },
    month: { revenue: 0, payout: 0, commission: 0, orders: 0, avgOrderValue: 0, conversionRate: 0, previousRevenue: 1, previousPayout: 1, previousCommission: 1, previousOrders: 1 },
  },
  dailyData: [],
  topProducts: [],
  commissionRate: 5,
};

const periodLabels: Record<Period, string> = {
  today: 'Hôm nay',
  week: '7 ngày',
  month: '30 ngày',
};

const PERIOD_TO_DAYS: Record<Period, 1 | 7 | 30> = {
  today: 1,
  week: 7,
  month: 30,
};

const VendorAnalytics = () => {
  const { addToast } = useToast();
  const [activePeriod, setActivePeriod] = useState<Period>('week');
  const [analytics, setAnalytics] = useState<AnalyticsData>(emptyAnalytics);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        setLoadError('');
        const next = await vendorPortalService.getAnalytics({ topProductsDays: PERIOD_TO_DAYS[activePeriod] });
        if (!active) return;
        setAnalytics(next);
      } catch (err: unknown) {
        if (!active) return;
        const message = getUiErrorMessage(err, 'Không tải được thống kê của shop');
        setLoadError(message);
        setAnalytics(emptyAnalytics);
        addToast(message, 'error');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [activePeriod, addToast, reloadKey]);

  const periodData = analytics.periods[activePeriod];
  const commission = { commission: periodData.commission, payout: periodData.payout };
  const prevCommission = { commission: periodData.previousCommission, payout: periodData.previousPayout };
  const revenueChange = ((periodData.revenue - periodData.previousRevenue) / Math.max(periodData.previousRevenue, 1)) * 100;
  const ordersChange = ((periodData.orders - periodData.previousOrders) / Math.max(periodData.previousOrders, 1)) * 100;
  const payoutChange = ((commission.payout - prevCommission.payout) / Math.max(prevCommission.payout, 1)) * 100;

  const stats: Array<{ label: string; value: string; sub: string; tone?: 'warning' | 'success' | 'info' }> = [
    {
      label: 'Doanh thu gộp',
      value: formatCurrency(periodData.revenue),
      sub: `${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}% so với kỳ trước`,
    },
    {
      label: 'Phí hoa hồng',
      value: formatCurrency(commission.commission),
      sub: `Tỷ lệ sàn ${analytics.commissionRate}%`,
      tone: 'warning',
    },
    {
      label: 'Thực nhận',
      value: formatCurrency(commission.payout),
      sub: `${payoutChange >= 0 ? '+' : ''}${payoutChange.toFixed(1)}% so với kỳ trước`,
      tone: 'success',
    },
    {
      label: 'Đơn hàng',
      value: periodData.orders.toString(),
      sub: `${ordersChange >= 0 ? '+' : ''}${ordersChange.toFixed(1)}% so với kỳ trước`,
      tone: 'info',
    },
  ] as const;

  const topRevenue = Math.max(...analytics.topProducts.map((item) => item.revenue), 1);

  const shareCurrentView = async () => {
    const copied = await copyTextToClipboard(window.location.href);
    addToast(
      copied ? 'Đã sao chép bộ lọc hiện tại của thống kê người bán' : 'Không thể sao chép bộ lọc',
      copied ? 'success' : 'error',
    );
  };

  const trendRows = useMemo(
    () =>
      analytics.dailyData.map((item) => ({
        ...item,
        payout: item.payout,
      })),
    [analytics.dailyData],
  );

  return (
    <VendorLayout
      title="Doanh thu thực nhận và hiệu suất shop"
      breadcrumbs={['Kênh Người Bán', 'Doanh thu thực nhận']}
      actions={(
        <>
          <div className="admin-tabs vendor-inline-tabs">
            {(['today', 'week', 'month'] as Period[]).map((period) => (
              <button key={period} className={`admin-tab ${activePeriod === period ? 'active vendor-active-tab' : ''}`} onClick={() => setActivePeriod(period)}>
                <Calendar size={14} />
                <span>{periodLabels[period]}</span>
              </button>
            ))}
          </div>
          <button className="admin-ghost-btn" onClick={() => void shareCurrentView()}>
            <Link2 size={16} />
            Chia sẻ
          </button>
          <button className="admin-ghost-btn">
            <Download size={16} />
            Xuất báo cáo
          </button>
        </>
      )}
    >
      {loading ? (
        <AdminStateBlock
          type="empty"
          title="Đang tải thống kê người bán"
          description="Doanh thu, thực nhận và hiệu suất đơn hàng con đang được đồng bộ."
        />
      ) : loadError ? (
        <AdminStateBlock
          type="error"
          title="Không tải được thống kê người bán"
          description={loadError}
          actionLabel="Thử lại"
          onAction={() => setReloadKey((key) => key + 1)}
        />
      ) : (
        <>
          <div className="admin-stats grid-4">
            {stats.map((item) => (
              <div key={item.label} className={`admin-stat-card ${item.tone || ''}`}>
                <div className="admin-stat-label">{item.label}</div>
                <div className="admin-stat-value">{item.value}</div>
                <div className="admin-stat-sub">{item.sub}</div>
              </div>
            ))}
          </div>

          <section className="admin-panels">
            <div className="admin-left">
              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2>Tổng quan kỳ hiện tại</h2>
                  <span className="admin-muted">{periodLabels[activePeriod]} là kỳ đối chiếu chính của shop</span>
                </div>
                <div className="admin-card-list">
                  <div className="admin-card-row">
                    <span className="admin-bold"><TrendingUp size={15} style={{ verticalAlign: -2, marginRight: 6 }} /> Tỷ lệ giao thành công</span>
                    <span className="admin-muted">{periodData.conversionRate}% trên tổng đơn đã phát sinh trong kỳ.</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold"><ShoppingCart size={15} style={{ verticalAlign: -2, marginRight: 6 }} /> Giá trị đơn trung bình</span>
                    <span className="admin-muted">{formatCurrency(periodData.avgOrderValue)} cho mỗi đơn hàng con.</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold"><Percent size={15} style={{ verticalAlign: -2, marginRight: 6 }} /> Hoa hồng sàn</span>
                    <span className="admin-muted">Áp dụng mức {analytics.commissionRate}% để ra thực nhận của shop.</span>
                  </div>
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2>Nhịp doanh thu và đối soát</h2>
                  <span className="admin-muted">{trendRows.length} mốc dữ liệu gần nhất</span>
                </div>
                {trendRows.length === 0 ? (
                  <AdminStateBlock
                    type="empty"
                    title="Chưa có dữ liệu doanh thu"
                    description="Dữ liệu biểu đồ sẽ xuất hiện sau khi shop phát sinh đơn hàng và đối soát."
                  />
                ) : (
                  <div className="admin-table" role="table" aria-label="Bảng xu hướng doanh thu">
                    <div className="admin-table-row vendor-analytics-trend admin-table-head" role="row">
                      <div role="columnheader">Ngày</div>
                      <div role="columnheader">Doanh thu gộp</div>
                      <div role="columnheader">Đơn hàng</div>
                      <div role="columnheader">Thực nhận</div>
                    </div>
                    {trendRows.map((item) => (
                      <div key={item.date} className="admin-table-row vendor-analytics-trend" role="row">
                        <div role="cell" className="admin-bold">{item.date}</div>
                        <div role="cell">{formatCurrency(item.revenue)}</div>
                        <div role="cell">{item.orders}</div>
                        <div role="cell"><span className="badge green">{formatCurrency(item.payout)}</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="admin-right">
              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2>Phân rã đối soát</h2>
                </div>
                <div className="admin-card-list">
                  <div className="admin-card-row">
                    <span className="admin-bold">Doanh thu gộp</span>
                    <span className="admin-muted">{formatCurrency(periodData.revenue)}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Phí hoa hồng</span>
                    <span className="admin-muted">-{formatCurrency(commission.commission)}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Thực nhận</span>
                    <span className="admin-muted">{formatCurrency(commission.payout)}</span>
                  </div>
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2>Top SKU theo thực nhận</h2>
                </div>
                {analytics.topProducts.length === 0 ? (
                  <AdminStateBlock
                    type="empty"
                    title="Chưa có sản phẩm nổi bật"
                    description="Top SKU sẽ xuất hiện khi shop phát sinh doanh thu."
                  />
                ) : (
                  <div className="vendor-top-products-grid">
                    {analytics.topProducts.map((product, index) => {
                      const payout = product.revenue * (1 - analytics.commissionRate / 100);
                      return (
                        <div key={product.id} className="vendor-analytics-product">
                          <div className="vendor-analytics-product-rank">#{index + 1}</div>
                          <img src={product.img} alt={product.name} className="vendor-analytics-product-img" />
                          <div className="vendor-analytics-product-info">
                            <span className="name">{product.name}</span>
                            <div className="stats">
                              <span className="stat"><Package size={12} /> {product.sales} đã bán</span>
                              <span className="stat revenue">{formatCurrency(product.revenue)}</span>
                            </div>
                            <div className="vendor-top-product-bar">
                              <span style={{ width: `${(product.revenue / topRevenue) * 100}%` }} />
                            </div>
                          </div>
                          <div className="vendor-analytics-product-payout">
                            <span className="label">Thực nhận</span>
                            <span className="value">{formatCurrency(payout)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </section>
        </>
      )}
    </VendorLayout>
  );
};

export default VendorAnalytics;
