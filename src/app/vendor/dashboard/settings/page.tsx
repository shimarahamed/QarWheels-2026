import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function VendorSettingsPage() {
  return (
    <div className="space-y-8">
        <header>
            <h1 className="text-3xl font-bold font-headline">Garage Settings</h1>
            <p className="text-muted-foreground">
            Manage your garage's public profile and operational settings.
            </p>
        </header>

        <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-2 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Business Profile</CardTitle>
                        <CardDescription>This information will be displayed publicly on your garage's page.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="garageName">Garage Name</Label>
                            <Input id="garageName" defaultValue="Precision Auto Qatar" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="garageAddress">Address</Label>
                            <Input id="garageAddress" defaultValue="Street 10, Industrial Area, Doha" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="garageDescription">Description</Label>
                            <Textarea id="garageDescription" placeholder="Tell customers what makes your garage special." rows={4} defaultValue="Your one-stop shop for premium car care, specializing in German and luxury vehicles. We combine expert craftsmanship with the latest technology." />
                        </div>
                         <Button>Save Changes</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Contact Information</CardTitle>
                        <CardDescription>How customers can reach you.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="garagePhone">Phone Number</Label>
                                <Input id="garagePhone" type="tel" defaultValue="+974 4455 6677" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="garageEmail">Email Address</Label>
                                <Input id="garageEmail" type="email" defaultValue="contact@precisionauto.qa" />
                            </div>
                        </div>
                         <Button>Save Changes</Button>
                    </CardContent>
                </Card>
            </div>

            <div className="md:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Opening Hours</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="hours-sun">Sunday</Label>
                            <Input id="hours-sun" className="w-40" defaultValue="8:00 AM - 7:00 PM" />
                        </div>
                         <div className="flex items-center justify-between">
                            <Label htmlFor="hours-mon">Monday</Label>
                            <Input id="hours-mon" className="w-40" defaultValue="8:00 AM - 7:00 PM" />
                        </div>
                         <div className="flex items-center justify-between">
                            <Label htmlFor="hours-tue">Tuesday</Label>
                            <Input id="hours-tue" className="w-40" defaultValue="8:00 AM - 7:00 PM" />
                        </div>
                         <div className="flex items-center justify-between">
                            <Label htmlFor="hours-wed">Wednesday</Label>
                            <Input id="hours-wed" className="w-40" defaultValue="8:00 AM - 7:00 PM" />
                        </div>
                         <div className="flex items-center justify-between">
                            <Label htmlFor="hours-thu">Thursday</Label>
                            <Input id="hours-thu" className="w-40" defaultValue="8:00 AM - 7:00 PM" />
                        </div>
                         <div className="flex items-center justify-between">
                            <Label htmlFor="hours-fri">Friday</Label>
                            <Input id="hours-fri" className="w-40" defaultValue="Closed" />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="hours-sat">Saturday</Label>
                            <Input id="hours-sat" className="w-40" defaultValue="9:00 AM - 5:00 PM" />
                        </div>
                        <Button className="w-full">Save Hours</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
