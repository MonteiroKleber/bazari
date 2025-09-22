-- Separar o ajuste de default do enum para evitar erro no shadow DB
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'CREATED';

