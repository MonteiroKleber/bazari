// apps/web/src/components/social/CreatePostButton.tsx

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CreatePostModal } from './CreatePostModal';

export function CreatePostButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Botão Mobile - Fixed no canto inferior direito, acima da barra de navegação */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg md:hidden z-50"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Botão Desktop - Static no header */}
      <Button
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex"
        size="default"
      >
        <Plus className="h-5 w-5 mr-2" />
        Criar Post
      </Button>

      <CreatePostModal open={open} onOpenChange={setOpen} />
    </>
  );
}
