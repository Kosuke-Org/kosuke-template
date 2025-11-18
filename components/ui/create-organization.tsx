'use client';

import { useState } from 'react';

import { Plus } from 'lucide-react';

import { CreateOrgDialog } from '@/components/create-org-dialog';
import { Button } from '@/components/ui/button';

export const CreateOrganization = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
        <Plus />
        Create Organization
      </Button>
      <CreateOrgDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </>
  );
};
