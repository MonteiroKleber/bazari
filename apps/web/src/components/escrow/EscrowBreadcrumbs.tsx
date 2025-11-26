import { ChevronRight, Home, ShoppingBag, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * EscrowBreadcrumbs - Navigation breadcrumbs for escrow pages
 *
 * Provides clear navigation context:
 * Dashboard > My Orders > Order #123 > Payment Protection
 *
 * Improves UX by showing current location and allowing quick navigation.
 *
 * @example
 * <EscrowBreadcrumbs orderId="ORD-123" />
 */

interface EscrowBreadcrumbsProps {
  /** Order ID (e.g., "ORD-123") */
  orderId: string;

  /** Custom className */
  className?: string;
}

export function EscrowBreadcrumbs({
  orderId,
  className,
}: EscrowBreadcrumbsProps) {
  return (
    <nav
      className={cn('flex items-center gap-2 text-sm', className)}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-2 flex-wrap">
        {/* Dashboard */}
        <li>
          <Link
            to="/app"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </li>

        <ChevronRight className="h-4 w-4 text-muted-foreground" />

        {/* My Orders */}
        <li>
          <Link
            to="/app/orders"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>My Orders</span>
          </Link>
        </li>

        <ChevronRight className="h-4 w-4 text-muted-foreground" />

        {/* Order ID */}
        <li>
          <Link
            to={`/app/orders/${orderId}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Order {orderId}
          </Link>
        </li>

        <ChevronRight className="h-4 w-4 text-muted-foreground" />

        {/* Payment Protection (current page) */}
        <li>
          <span
            className="flex items-center gap-1.5 text-foreground font-medium"
            aria-current="page"
          >
            <Shield className="h-4 w-4" />
            <span>Payment Protection</span>
          </span>
        </li>
      </ol>
    </nav>
  );
}

/**
 * AdminEscrowBreadcrumbs - Breadcrumbs for admin escrow dashboard
 *
 * @example
 * <AdminEscrowBreadcrumbs />
 */
export function AdminEscrowBreadcrumbs({ className }: { className?: string }) {
  return (
    <nav
      className={cn('flex items-center gap-2 text-sm', className)}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-2">
        {/* Dashboard */}
        <li>
          <Link
            to="/app"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </li>

        <ChevronRight className="h-4 w-4 text-muted-foreground" />

        {/* Admin Escrows (current page) */}
        <li>
          <span
            className="flex items-center gap-1.5 text-foreground font-medium"
            aria-current="page"
          >
            <Shield className="h-4 w-4" />
            <span>Admin Escrows</span>
          </span>
        </li>
      </ol>
    </nav>
  );
}
