import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { customerRepository } from '@/lib/db/customerRepository';
import { usePOSStore } from '../store/posStore';
import { Button } from '@/components/ui/button';
import { User, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { CustomerFormDialog } from '@/features/customers/components/CustomerFormDialog';
import type { Customer } from '@/lib/db/schema';

export function CustomerSelector() {
  const { customer, setCustomer } = usePOSStore();
  const [open, setOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const customers = useLiveQuery(() => customerRepository.getAll()) || [];

  const handleSelect = (c: Customer) => {
    setCustomer(c);
    setOpen(false);
  };

  const handleCreateSuccess = () => {
    // Ideally select the newly created customer, but getting ID is async
    // For now user can search for it immediately
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal"
            role="combobox"
          >
            <User className="mr-2 h-4 w-4 opacity-50" />
            {customer ? (
              <span className="truncate">{customer.name}</span>
            ) : (
              <span className="text-muted-foreground">Pilih Pelanggan...</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Cari pelanggan..." />
            <CommandList>
              <CommandEmpty>Pelanggan tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                <CommandItem onSelect={() => setIsDialogOpen(true)} className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Pelanggan Baru
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setCustomer(null);
                    setOpen(false);
                  }}
                  className="cursor-pointer text-muted-foreground"
                >
                  -- Pelanggan Umum --
                </CommandItem>
                {customers.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.name}
                    onSelect={() => handleSelect(c)}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span>{c.name}</span>
                      {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <CustomerFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
}
