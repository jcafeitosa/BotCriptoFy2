import { db } from '@/db';
import { and, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { leads } from '../schema/leads.schema';
import { campaigns } from '../schema/campaigns.schema';
import { campaignSends } from '../schema/campaign-sends.schema';
import type {
  ConversionFunnel,
  LeadSourceStats,
  TopCampaign,
} from '../types';

interface LeadAnalyticsResult {
  total: number;
  newLeads: number;
  contacted: number;
  qualified: number;
  converted: number;
  lost: number;
  funnel: ConversionFunnel;
  sources: LeadSourceStats[];
}

interface CampaignOverviewResult {
  topCampaigns: TopCampaign[];
  totalSends: number;
  averageOpenRate: number;
  averageClickRate: number;
}

interface DateRangeFilter {
  dateFrom?: Date;
  dateTo?: Date;
}

export class MarketingAnalyticsService {
  static async getLeadAnalytics(
    tenantId: string,
    range: DateRangeFilter = {},
  ): Promise<LeadAnalyticsResult> {
    const conditions = [eq(leads.tenantId, tenantId), isNull(leads.deletedAt)];
    if (range.dateFrom) {
      conditions.push(gte(leads.createdAt, range.dateFrom));
    }
    if (range.dateTo) {
      conditions.push(lte(leads.createdAt, range.dateTo));
    }

    const [totals] = await db
      .select({
        total: sql<number>`count(*)::int`,
        newLeads: sql<number>`count(*) FILTER (WHERE status = 'new')::int`,
        contacted: sql<number>`count(*) FILTER (WHERE status = 'contacted')::int`,
        qualified: sql<number>`count(*) FILTER (WHERE status = 'qualified')::int`,
        converted: sql<number>`count(*) FILTER (WHERE status = 'converted')::int`,
        lost: sql<number>`count(*) FILTER (WHERE status = 'lost')::int`,
      })
      .from(leads)
      .where(and(...conditions));

    const sourcesRaw = await db
      .select({
        source: leads.source,
        count: sql<number>`count(*)::int`,
        avgScore: sql<number>`coalesce(avg(score)::numeric, 0)::float` ,
        converted: sql<number>`count(*) FILTER (WHERE status = 'converted')::int`,
      })
      .from(leads)
      .where(and(...conditions))
      .groupBy(leads.source);

    const sources: LeadSourceStats[] = sourcesRaw.map((row) => {
      const total = totals.total || 1;
      const conversionRate = row.count > 0 ? (row.converted / row.count) * 100 : 0;
      return {
        source: row.source || 'unknown',
        count: row.count,
        percentage: (row.count / total) * 100,
        avgScore: row.avgScore,
        conversionRate,
      };
    });

    const funnel: ConversionFunnel = {
      totalLeads: totals.total,
      newLeads: totals.newLeads,
      contacted: totals.contacted,
      qualified: totals.qualified,
      converted: totals.converted,
      lost: totals.lost,
      conversionRate: percentage(totals.converted, totals.total),
      stages: [
        { stage: 'new', count: totals.newLeads, percentage: percentage(totals.newLeads, totals.total) },
        { stage: 'contacted', count: totals.contacted, percentage: percentage(totals.contacted, totals.total) },
        { stage: 'qualified', count: totals.qualified, percentage: percentage(totals.qualified, totals.total) },
        { stage: 'converted', count: totals.converted, percentage: percentage(totals.converted, totals.total) },
        { stage: 'lost', count: totals.lost, percentage: percentage(totals.lost, totals.total) },
      ],
    };

    return {
      total: totals.total,
      newLeads: totals.newLeads,
      contacted: totals.contacted,
      qualified: totals.qualified,
      converted: totals.converted,
      lost: totals.lost,
      funnel,
      sources,
    };
  }

  static async getCampaignOverview(
    tenantId: string,
    range: DateRangeFilter = {},
    limit = 5,
  ): Promise<CampaignOverviewResult> {
    const sendConditions = [eq(campaigns.tenantId, tenantId)];
    const sendDateColumn = campaignSends.sentAt ?? campaignSends.createdAt;

    if (range.dateFrom) {
      sendConditions.push(gte(sendDateColumn, range.dateFrom));
    }
    if (range.dateTo) {
      sendConditions.push(lte(sendDateColumn, range.dateTo));
    }

    const stats = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        type: campaigns.type,
        totalSends: sql<number>`count(${campaignSends.id})::int`,
        delivered: sql<number>`count(${campaignSends.id}) FILTER (WHERE ${campaignSends.status} = 'delivered')::int`,
        opened: sql<number>`count(${campaignSends.id}) FILTER (WHERE ${campaignSends.status} = 'opened')::int`,
        clicked: sql<number>`count(${campaignSends.id}) FILTER (WHERE ${campaignSends.status} = 'clicked')::int`,
      })
      .from(campaigns)
      .leftJoin(campaignSends, eq(campaigns.id, campaignSends.campaignId))
      .where(and(...sendConditions))
      .groupBy(campaigns.id)
      .orderBy(desc(sql`count(${campaignSends.id})`))
      .limit(limit);

    let totalSends = 0;
    let totalOpenRate = 0;
    let totalClickRate = 0;

    const topCampaigns: TopCampaign[] = stats.map((item) => {
      const openRate = item.totalSends > 0 ? (item.opened / item.totalSends) * 100 : 0;
      const clickRate = item.totalSends > 0 ? (item.clicked / item.totalSends) * 100 : 0;

      totalSends += item.totalSends;
      totalOpenRate += openRate;
      totalClickRate += clickRate;

      return {
        id: item.id,
        name: item.name,
        type: item.type,
        totalSends: item.totalSends,
        openRate,
        clickRate,
      };
    });

    return {
      topCampaigns,
      totalSends,
      averageOpenRate: topCampaigns.length > 0 ? totalOpenRate / topCampaigns.length : 0,
      averageClickRate: topCampaigns.length > 0 ? totalClickRate / topCampaigns.length : 0,
    };
  }
}

export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

export default MarketingAnalyticsService;
