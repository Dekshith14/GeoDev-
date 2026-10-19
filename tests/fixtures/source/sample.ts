// Sample TypeScript fixture file for Tree-sitter parsing tests

export interface UserService {
  getUser(id: string): Promise<User>;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserServiceImpl implements UserService {
  private readonly users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User not found: ${id}`);
    }
    return user;
  }

  addUser(user: User): void {
    this.users.set(user.id, user);
  }
}

export function createDefaultUser(name: string): User {
  return {
    id: Math.random().toString(36).slice(2),
    name,
    email: `${name.toLowerCase()}@example.com`,
  };
}

import { readFileSync } from 'fs';
import path from 'path';
