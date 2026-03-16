import {ApiSuccess} from '../../types/api';

export interface PersonalNote {
  id: number;
  title: string;
  content: string;
  date: string; // YYYY-MM-DD
}

export const MOCK_PERSONAL_NOTES: ApiSuccess<PersonalNote[]> = {
  success: true,
  data: [
    {
      id: 1,
      title: 'Insurance Documents',
      content: 'Reminder to submit updated insurance documents to HR before end of month.',
      date: '2026-03-10',
    },
    {
      id: 2,
      title: 'Team Meeting Agenda',
      content: 'Discuss Q2 project timeline and resource allocation.',
      date: '2026-03-08',
    },
    {
      id: 3,
      title: 'Leave Planning',
      content: 'Book flights for family vacation March 15-17. Hotel confirmed.',
      date: '2026-03-01',
    },
    {
      id: 4,
      title: 'Training Certificate',
      content: 'AWS certification exam scheduled for March 20. Materials ready.',
      date: '2026-02-25',
    },
  ],
  pagination: {page: 1, pageSize: 20, total: 4, totalPages: 1},
};

export const MOCK_NOTE_CREATE_SUCCESS: ApiSuccess<{id: number}> = {
  success: true,
  data: {id: 5},
  message: 'Note saved.',
};
