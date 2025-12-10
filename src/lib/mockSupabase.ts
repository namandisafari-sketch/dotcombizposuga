// Mock Supabase client to block all Supabase calls during local development
const mockSupabaseClient = {
  auth: {
    signUp: () => Promise.reject(new Error('Supabase disabled - use local backend')),
    signInWithPassword: () => Promise.reject(new Error('Supabase disabled - use local backend')),
    signInWithOtp: () => Promise.reject(new Error('Supabase disabled - use local backend')),
    signOut: () => Promise.reject(new Error('Supabase disabled - use local backend')),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    refreshSession: () => Promise.reject(new Error('Supabase disabled - use local backend')),
  },
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.reject(new Error('Supabase disabled - use local backend')),
    update: () => Promise.reject(new Error('Supabase disabled - use local backend')),
    delete: () => Promise.reject(new Error('Supabase disabled - use local backend')),
    upsert: () => Promise.reject(new Error('Supabase disabled - use local backend')),
  }),
  storage: {
    from: () => ({
      upload: () => Promise.reject(new Error('Supabase disabled - use local backend')),
      download: () => Promise.reject(new Error('Supabase disabled - use local backend')),
      remove: () => Promise.reject(new Error('Supabase disabled - use local backend')),
      createSignedUrl: () => Promise.reject(new Error('Supabase disabled - use local backend')),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
  rpc: () => Promise.reject(new Error('Supabase disabled - use local backend')),
  channel: () => ({
    on: () => ({ subscribe: () => {} }),
    subscribe: () => {},
    unsubscribe: () => {},
  }),
};

export const supabase = mockSupabaseClient as any;
