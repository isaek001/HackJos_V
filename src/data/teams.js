import {
  Camera,
  Cpu,
  Megaphone,
  HeartHandshake,
  UserCheck,
  DoorOpen,
  Gift,
} from 'lucide-react'

/**
 * Volunteer teams.
 * `icon` is a lucide-react component (sized/coloured with Tailwind utilities),
 * `accent` is the brand colour used for badges and filters.
 */
export const TEAMS = [
  {
    id: 'technical',
    name: 'Technical',
    tag: 'T',
    icon: Cpu,
    short: 'Sound, screens, network & power',
    blurb:
      'Keep the event tech running — devices, projectors, Wi-Fi, power, and live support for teams across the 48hr sprint.',
    duties: ['AV & stage setup', 'Network and power', 'On-call support'],
    accent: '#0B3D2A',
    accentLight: '#7fe3b0',
  },
  {
    id: 'media',
    name: 'Media',
    tag: 'MD',
    icon: Camera,
    short: 'Photos, video & social',
    blurb:
      'Tell the story of the 48 hours — photos, video, and the social posts that keep the energy up before, during and after the sprint.',
    duties: ['Photo & video coverage', 'Social media posts', 'Event documentation'],
    accent: '#6D28D9',
    accentLight: '#c9b8fd',
  },
  {
    id: 'mentors',
    name: '48hr Challenge Mentors',
    tag: 'M',
    icon: Megaphone,
    short: 'Coordinate mentor sessions & teams',
    blurb:
      'Coordinate the mentor squad: schedule sessions, pair teams with the right experts, and keep the floor moving.',
    duties: ['Mentor scheduling', 'Team pairing', 'Session tracking'],
    accent: '#1D6FF2',
    accentLight: '#9dc0ff',
  },
  {
    id: 'swags',
    name: 'Swags',
    tag: 'S',
    icon: Gift,
    short: 'Kits, shirts, badges & merch',
    blurb:
      'Pack, store and hand out participant kits — shirts, badges, stickers and sponsor merch for 500+ attendees.',
    duties: ['Kit assembly', 'Inventory counts', 'Distribution desk'],
    accent: '#C2540A',
    accentLight: '#ffb583',
  },
  {
    id: 'registration',
    name: 'Registration',
    tag: 'R',
    icon: UserCheck,
    short: 'Check-in, badges & queues',
    blurb:
      'First point of contact. Check attendees in, verify tickets, print badges and keep the arrival queue short.',
    duties: ['Check-in & QR scan', 'Badge printing', 'Queue management'],
    accent: '#0E7C5B',
    accentLight: '#5fe0b4',
  },
  {
    id: 'ushering',
    name: 'Ushering',
    tag: 'U',
    icon: DoorOpen,
    short: 'Seating, rooms & guest flow',
    blurb:
      'Guide guests to seats, manage session rooms and doorways, and make sure the programme runs on time.',
    duties: ['Seating & directions', 'Room marshalling', 'Guest support'],
    accent: '#8A6D00',
    accentLight: '#f0d66b',
  },
  {
    id: 'welfare',
    name: 'Welfare',
    tag: 'W',
    icon: HeartHandshake,
    short: 'Meals, water & rest areas',
    blurb:
      'Feed and look after everyone — meals, water, snacks, rest areas and a friendly face when it gets long.',
    duties: ['Meals & refreshments', 'Rest area setup', 'Wellbeing checks'],
    accent: '#BE2D5E',
    accentLight: '#ff9cbd',
  },
]

export const teamById = (id) => TEAMS.find((t) => t.id === id)