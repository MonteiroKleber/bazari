// apps/web/src/components/social/CreatePostButton.tsx

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CreatePostModal } from './CreatePostModal';

export function CreatePostButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg md:h-auto md:w-auto md:rounded-md md:px-4"
        size="icon"
      >
        <Plus className="h-6 w-6 md:mr-2" />
        <span className="hidden md:inline">Criar Post</span>
      </Button>

      <CreatePostModal open={open} onOpenChange={setOpen} />
    </>
  );
}
