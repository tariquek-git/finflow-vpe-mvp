import React from 'react';
import { 
  Building2, User, Briefcase, CreditCard, Globe, Database, 
  ShieldCheck, Zap, Server, ArrowRightLeft, Landmark, 
  Type as TypeIcon, Smartphone, Lock, Scale, ShieldAlert, Layers,
  Wallet, Building, CircleDot
} from 'lucide-react';
import { EntityType, PaymentRail, EndPointType } from './types';

export const ENTITY_ICONS: Record<EntityType, React.ReactNode> = {
  // Institutions
  [EntityType.CENTRAL_BANK]: <Landmark className="w-5 h-5 text-slate-900" />,
  [EntityType.SPONSOR_BANK]: <Building2 className="w-5 h-5 text-emerald-600" />,
  [EntityType.ISSUING_BANK]: <Building2 className="w-5 h-5 text-blue-600" />,
  [EntityType.ACQUIRING_BANK]: <Building2 className="w-5 h-5 text-indigo-600" />,
  [EntityType.CORRESPONDENT_BANK]: <Globe className="w-5 h-5 text-cyan-600" />,
  [EntityType.CREDIT_UNION]: <Building className="w-5 h-5 text-teal-600" />,

  // Intermediaries
  [EntityType.PROGRAM_MANAGER]: <Zap className="w-5 h-5 text-amber-500" />,
  [EntityType.PROCESSOR]: <Server className="w-5 h-5 text-slate-500" />,
  [EntityType.GATEWAY]: <ArrowRightLeft className="w-5 h-5 text-violet-500" />,
  [EntityType.NETWORK]: <CreditCard className="w-5 h-5 text-blue-500" />,
  [EntityType.SWITCH]: <ArrowRightLeft className="w-5 h-5 text-orange-500" />,
  [EntityType.WALLET_PROVIDER]: <Wallet className="w-5 h-5 text-purple-600" />,
  
  // Treasury
  [EntityType.GATE]: <ShieldAlert className="w-5 h-5 text-rose-500" />,
  [EntityType.LIQUIDITY_PROVIDER]: <Database className="w-5 h-5 text-blue-800" />,

  // End Points (Default icon, overridden by sub-type in UI)
  [EntityType.END_POINT]: <User className="w-5 h-5 text-slate-700" />,
  
  // Util
  [EntityType.TEXT_BOX]: <TypeIcon className="w-5 h-5 text-slate-400" />,
  [EntityType.ANCHOR]: <CircleDot className="w-4 h-4 text-slate-400" />
};

export const ENDPOINT_ICONS: Record<EndPointType, React.ReactNode> = {
  [EndPointType.CONSUMER]: <User className="w-5 h-5 text-violet-600" />,
  [EndPointType.MERCHANT]: <Briefcase className="w-5 h-5 text-rose-600" />,
  [EndPointType.CORPORATE]: <Building2 className="w-5 h-5 text-slate-700" />,
  [EndPointType.OTHER]: <User className="w-5 h-5 text-slate-500" />,
};

export const RAIL_COLORS: Record<string, string> = {
  // Default/Blank
  [PaymentRail.BLANK]: '#94a3b8',

  // US
  [PaymentRail.ACH]: '#059669', // Emerald
  [PaymentRail.RTP]: '#0891b2', // Cyan
  [PaymentRail.FEDNOW]: '#4f46e5', // Indigo
  [PaymentRail.WIRE]: '#b91c1c', // Red

  // Global
  [PaymentRail.SWIFT]: '#0284c7', // Sky
  [PaymentRail.BANK_TRANSFER]: '#64748b', // Slate

  // Canada
  [PaymentRail.EFT_CANADA]: '#d97706', // Amber
  [PaymentRail.INTERAC]: '#ca8a04', // Yellow

  // Card
  [PaymentRail.CARD_NETWORK]: '#1e293b', // Dark Slate

  // Physical/Other
  [PaymentRail.CASH]: '#854d0e', // Brown
  [PaymentRail.CHEQUE]: '#78716c', // Stone
  [PaymentRail.INTERNAL_LEDGER]: '#6366f1', // Indigo
  [PaymentRail.ON_US]: '#8b5cf6', // Violet
  [PaymentRail.STABLECOIN]: '#10b981', // Emerald
  [PaymentRail.CARRIER_PIGEON]: '#ec4899', // Pink (Why not?)
  [PaymentRail.OTHER]: '#94a3b8'  // Gray
};

// --- BANKING LOGIC: NEXT STEP RECOMMENDATIONS ---
// This acts as the "Domain Brain" to suggest likely next hops.
export const NEXT_STEP_RECOMMENDATIONS: Record<EntityType, EntityType[]> = {
    [EntityType.SPONSOR_BANK]: [EntityType.PROGRAM_MANAGER, EntityType.PROCESSOR, EntityType.CENTRAL_BANK, EntityType.NETWORK],
    [EntityType.ISSUING_BANK]: [EntityType.PROCESSOR, EntityType.NETWORK, EntityType.WALLET_PROVIDER],
    [EntityType.ACQUIRING_BANK]: [EntityType.NETWORK, EntityType.PROCESSOR, EntityType.GATEWAY],
    [EntityType.CENTRAL_BANK]: [EntityType.SPONSOR_BANK, EntityType.CORRESPONDENT_BANK],
    [EntityType.CORRESPONDENT_BANK]: [EntityType.SPONSOR_BANK, EntityType.NETWORK],
    [EntityType.CREDIT_UNION]: [EntityType.CENTRAL_BANK, EntityType.NETWORK],

    [EntityType.PROGRAM_MANAGER]: [EntityType.SPONSOR_BANK, EntityType.PROCESSOR, EntityType.END_POINT],
    [EntityType.PROCESSOR]: [EntityType.NETWORK, EntityType.ISSUING_BANK, EntityType.ACQUIRING_BANK, EntityType.GATEWAY],
    [EntityType.GATEWAY]: [EntityType.PROCESSOR, EntityType.ACQUIRING_BANK, EntityType.END_POINT],
    [EntityType.NETWORK]: [EntityType.ISSUING_BANK, EntityType.ACQUIRING_BANK, EntityType.PROCESSOR],
    [EntityType.SWITCH]: [EntityType.SPONSOR_BANK, EntityType.CENTRAL_BANK],
    [EntityType.WALLET_PROVIDER]: [EntityType.ISSUING_BANK, EntityType.END_POINT],

    [EntityType.GATE]: [EntityType.SPONSOR_BANK, EntityType.PROGRAM_MANAGER],
    [EntityType.LIQUIDITY_PROVIDER]: [EntityType.SPONSOR_BANK, EntityType.CORRESPONDENT_BANK],

    [EntityType.END_POINT]: [EntityType.WALLET_PROVIDER, EntityType.GATEWAY, EntityType.SPONSOR_BANK],
    [EntityType.TEXT_BOX]: [],
    [EntityType.ANCHOR]: []
};