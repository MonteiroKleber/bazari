import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import type { Address } from '@/types/delivery';

interface AddressCardProps {
  address: Address;
  title: string;
  icon?: React.ReactNode;
  contact?: {
    name: string;
    phone: string;
  };
}

export function AddressCard({ address, title, icon, contact }: AddressCardProps) {
  const formatAddress = (addr: Address) => {
    return `${addr.street}, ${addr.number}${addr.complement ? ` ${addr.complement}` : ''} - ${addr.neighborhood || ''} - ${addr.city}, ${addr.state} - CEP: ${addr.zipCode}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon || <MapPin className="h-5 w-5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-medium">{formatAddress(address)}</p>

        {contact && (
          <>
            <div className="text-sm">
              <p className="text-muted-foreground">Contato:</p>
              <p className="font-medium">{contact.name}</p>
              <p className="text-muted-foreground">{contact.phone}</p>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                asChild
                className="flex-1"
              >
                <a href={`tel:${contact.phone}`}>
                  📞 Ligar
                </a>
              </Button>
              <Button
                size="sm"
                variant="outline"
                asChild
                className="flex-1"
              >
                <a
                  href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  💬 WhatsApp
                </a>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
