import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface VendorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    vendor?: any;
}

export function VendorDialog({ open, onOpenChange, onSuccess, vendor }: VendorDialogProps) {
    const isEditMode = !!vendor;

    const [formData, setFormData] = useState({
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        address: {
            street: "",
            city: "",
            state: "",
            pincode: "",
            country: "India"
        },
        vendorType: "Supplier" as 'Supplier' | 'Service Provider' | 'Contractor' | 'Other',
        gstNumber: "",
        panNumber: "",
        bankDetails: {
            accountNumber: "",
            ifscCode: "",
            bankName: "",
            accountHolderName: ""
        },
        paymentTerms: "Net 30" as 'COD' | 'Net 15' | 'Net 30' | 'Net 45' | 'Net 60' | 'Advance',
        creditLimit: 0,
        rating: 3,
        notes: "",
        status: "active" as 'active' | 'inactive' | 'blacklisted'
    });
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Populate form when editing
    useEffect(() => {
        if (vendor && open) {
            setFormData({
                name: vendor.name || "",
                contactPerson: vendor.contactPerson || "",
                email: vendor.email || "",
                phone: vendor.phone || "",
                address: {
                    street: vendor.address?.street || "",
                    city: vendor.address?.city || "",
                    state: vendor.address?.state || "",
                    pincode: vendor.address?.pincode || "",
                    country: vendor.address?.country || "India"
                },
                vendorType: vendor.vendorType || "Supplier",
                gstNumber: vendor.gstNumber || "",
                panNumber: vendor.panNumber || "",
                bankDetails: {
                    accountNumber: vendor.bankDetails?.accountNumber || "",
                    ifscCode: vendor.bankDetails?.ifscCode || "",
                    bankName: vendor.bankDetails?.bankName || "",
                    accountHolderName: vendor.bankDetails?.accountHolderName || ""
                },
                paymentTerms: vendor.paymentTerms || "Net 30",
                creditLimit: vendor.creditLimit || 0,
                rating: vendor.rating || 3,
                notes: vendor.notes || "",
                status: vendor.status || "active"
            });
        }
    }, [vendor, open]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name) {
            toast({
                title: "Invalid Input",
                description: "Vendor name is required",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            if (isEditMode) {
                await apiClient.updateVendor(vendor._id || vendor.id, formData);
                toast({
                    title: "Success",
                    description: "Vendor updated successfully",
                });
            } else {
                await apiClient.createVendor(formData);
                toast({
                    title: "Success",
                    description: "Vendor created successfully",
                });
            }

            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} vendor`,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? 'Update vendor information.' : 'Add a new vendor to your supplier network.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Vendor Name *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter vendor name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="Enter email address"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="Enter phone number"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="contactPerson">Contact Person</Label>
                        <Input
                            id="contactPerson"
                            value={formData.contactPerson}
                            onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                            placeholder="Enter contact person"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="street">Address</Label>
                        <Input
                            id="street"
                            value={formData.address.street}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                address: { ...prev.address, street: e.target.value }
                            }))}
                            placeholder="Street address"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input
                                id="city"
                                value={formData.address.city}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    address: { ...prev.address, city: e.target.value }
                                }))}
                                placeholder="City"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="state">State</Label>
                            <Input
                                id="state"
                                value={formData.address.state}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    address: { ...prev.address, state: e.target.value }
                                }))}
                                placeholder="State"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pincode">Pincode</Label>
                            <Input
                                id="pincode"
                                value={formData.address.pincode}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    address: { ...prev.address, pincode: e.target.value }
                                }))}
                                placeholder="Pincode"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="vendorType">Vendor Type</Label>
                            <Select value={formData.vendorType} onValueChange={(value: any) =>
                                setFormData(prev => ({ ...prev, vendorType: value }))
                            }>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Supplier">Supplier</SelectItem>
                                    <SelectItem value="Service Provider">Service Provider</SelectItem>
                                    <SelectItem value="Contractor">Contractor</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="paymentTerms">Payment Terms</Label>
                            <Select value={formData.paymentTerms} onValueChange={(value: any) =>
                                setFormData(prev => ({ ...prev, paymentTerms: value }))
                            }>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="COD">COD</SelectItem>
                                    <SelectItem value="Net 15">Net 15</SelectItem>
                                    <SelectItem value="Net 30">Net 30</SelectItem>
                                    <SelectItem value="Net 45">Net 45</SelectItem>
                                    <SelectItem value="Net 60">Net 60</SelectItem>
                                    <SelectItem value="Advance">Advance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="gstNumber">GST Number</Label>
                            <Input
                                id="gstNumber"
                                value={formData.gstNumber}
                                onChange={(e) => setFormData(prev => ({ ...prev, gstNumber: e.target.value }))}
                                placeholder="Enter GST number"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="panNumber">PAN Number</Label>
                            <Input
                                id="panNumber"
                                value={formData.panNumber}
                                onChange={(e) => setFormData(prev => ({ ...prev, panNumber: e.target.value }))}
                                placeholder="Enter PAN number"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Additional notes (optional)"
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Vendor" : "Create Vendor")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
