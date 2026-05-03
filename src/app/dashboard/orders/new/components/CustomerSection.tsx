import { getMessages } from "@/i18n/getMessages";
import { Customer } from "@/types/customer";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

export interface Branch {
    id: string;
    name: string;
}

interface CustomerSectionProps {
    selectedBranch: Branch | null;
    availableBranches: Branch[];
    onBranchChange: (branch?: any) => void;
    isAdmin: boolean;

    // Search State
    isCustomerSearchOpen: boolean;
    setIsCustomerSearchOpen: (open: boolean) => void;
    customerSearchQuery: string;
    setCustomerSearchQuery: (query: string) => void;
    customerSearchResults: Customer[];
    customerSearchLoading: boolean;
    onCustomerSelect: (customer: Customer) => void;

    // Orderer State
    ordererName: string;
    setOrdererName: (name: string) => void;
    ordererContact: string;
    setOrdererContact: (contact: string) => void;
    ordererCompany: string;
    setOrdererCompany: (company: string) => void;
    isAnonymous: boolean;
    setIsAnonymous: (isAnonymous: boolean) => void;
    registerCustomer: boolean;
    setRegisterCustomer: (register: boolean) => void;

    formatPhoneNumber: (value: string) => string;
}

export function CustomerSection({
    selectedBranch,
    availableBranches,
    onBranchChange,
    isAdmin,
    isCustomerSearchOpen,
    setIsCustomerSearchOpen,
    customerSearchQuery,
    setCustomerSearchQuery,
    customerSearchResults,
    customerSearchLoading,
    onCustomerSelect,
    ordererName,
    setOrdererName,
    ordererContact,
    setOrdererContact,
    ordererCompany,
    setOrdererCompany,
    isAnonymous,
    setIsAnonymous,
    registerCustomer,
    setRegisterCustomer,
    formatPhoneNumber
}: CustomerSectionProps) {
    const locale = usePreferredLocale();
    const tf = getMessages(locale).tenantFlows;
    const baseLocale = toBaseLocale(locale);
    const phContact = pickUiText(
        baseLocale,
        "010-0000-0000",
        "+1 555-000-0000",
        "0909 000 000"
    );
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center justify-between">
                    <span>{tf.f00644}</span>
                    {isAdmin && availableBranches.length > 1 && (
                        <div className="flex items-center gap-2">
                            <Label className="text-sm font-normal whitespace-nowrap">{tf.f00663}:</Label>
                            <select
                                className="text-sm border rounded px-2 py-1"
                                value={selectedBranch?.name || ''}
                                onChange={(e) => {
                                    const branch = availableBranches.find(b => b.name === e.target.value);
                                    if (branch) onBranchChange(branch);
                                }}
                            >
                                <option value="" disabled>{tf.f00664}</option>
                                {availableBranches.map(b => (
                                    <option key={b.id} value={b.name}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Customer Search */}
                <div className="customer-search-container relative">
                    <Label className="text-sm font-medium mb-1.5 block">{tf.f00058}</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={tf.f00503}
                            value={customerSearchQuery}
                            onChange={(e) => setCustomerSearchQuery(e.target.value)}
                            onFocus={() => setIsCustomerSearchOpen(true)}
                            className="pl-9"
                        />
                    </div>
                    {isCustomerSearchOpen && customerSearchQuery.trim().length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {customerSearchLoading ? (
                                <div className="p-4 text-center text-sm text-gray-500">{tf.f00037}</div>
                            ) : customerSearchResults.length > 0 ? (
                                customerSearchResults.map((customer) => (
                                    <div
                                        key={customer.id}
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                        onClick={() => onCustomerSelect(customer)}
                                    >
                                        <div className="font-medium">
                                            {customer.name}
                                            {customer.company_name && <span className="text-xs text-muted-foreground ml-2">({customer.company_name})</span>}
                                        </div>
                                        <div className="text-gray-500 text-xs">{customer.contact}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-sm text-gray-500">
                                    {tf.f00036} <br />
                                    <span className="text-xs text-muted-foreground">{tf.f00427}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="ordererCompany">{tf.f00779}</Label>
                        <Input
                            id="ordererCompany"
                            value={ordererCompany}
                            onChange={(e) => setOrdererCompany(e.target.value)}
                            placeholder={tf.f00780}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="ordererName">{tf.f00647}</Label>
                            <Input
                                id="ordererName"
                                value={ordererName}
                                onChange={(e) => setOrdererName(e.target.value)}
                                placeholder={tf.f00774}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ordererContact">{tf.f00444}</Label>
                            <Input
                                id="ordererContact"
                                value={ordererContact}
                                onChange={(e) => setOrdererContact(formatPhoneNumber(e.target.value))}
                                placeholder={phContact}
                                maxLength={13}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="anonymous"
                            checked={isAnonymous}
                            onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                        />
                        <Label htmlFor="anonymous" className="leading-none cursor-pointer">{tf.f00512}</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="registerCustomer"
                            checked={registerCustomer}
                            onCheckedChange={(checked) => setRegisterCustomer(checked as boolean)}
                            disabled={isAnonymous || !!customerSearchResults.find(c => c.contact === ordererContact && c.name === ordererName)}
                        />
                        <Label htmlFor="registerCustomer" className="leading-none cursor-pointer">{tf.f00067}</Label>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
