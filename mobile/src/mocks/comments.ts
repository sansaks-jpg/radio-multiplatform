export interface LiveComment {
  id: string;
  user_name: string;
  avatar_seed: string;
  message: string;
  created_at: string;
  is_highlighted?: boolean;
}

export const mockComments: LiveComment[] = [];
