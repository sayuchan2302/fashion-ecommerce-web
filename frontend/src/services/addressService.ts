import type { Address } from '../types';

const KEY = 'coolmate_addresses_v1';

const load = (): Address[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const save = (data: Address[]) => {
  localStorage.setItem(KEY, JSON.stringify(data));
};

export const addressService = {
  getAll(): Address[] {
    const data = load();
    if (data.length === 0) {
      const seed: Address[] = [
        {
          id: 'addr-1',
          fullName: 'Anh Thịnh',
          phone: '0382253049',
          street: 'JJJV+Q7F, Quốc lộ 37',
          ward: 'Thị trấn Hùng Sơn',
          district: 'Huyện Đại Từ',
          city: 'Thái Nguyên',
          isDefault: true,
        },
      ];
      save(seed);
      return seed;
    }
    return data.map(addr => ({ ...addr, isDefault: Boolean(addr.isDefault) }));
  },

  add(address: Omit<Address, 'id'>): Address {
    const data = this.getAll();
    const isDefault = Boolean(address.isDefault);
    const newAddr: Address = { ...address, id: 'addr-' + Date.now(), isDefault };
    const next = isDefault
      ? data.map(a => ({ ...a, isDefault: false })).concat(newAddr)
      : [...data, newAddr];
    save(next);
    return newAddr;
  },

  update(id: string, payload: Partial<Address>): Address | null {
    const data = this.getAll();
    let updated: Address | null = null;
    const next = data.map(addr => {
      if (addr.id !== id) return addr;
      updated = { ...addr, ...payload, id };
      return updated;
    });
    if (!updated) return null;
    if (payload.isDefault) {
      for (const addr of next) {
        if (addr.id !== id) addr.isDefault = false;
      }
    }
    save(next);
    return updated;
  },

  remove(id: string) {
    const data = this.getAll();
    const next = data.filter(a => a.id !== id);
    // ensure one default remains
    if (!next.some(a => a.isDefault) && next.length > 0) {
      next[0].isDefault = true;
    }
    save(next);
  },

  setDefault(id: string) {
    const data = this.getAll().map(a => ({ ...a, isDefault: a.id === id }));
    save(data);
  },
};
