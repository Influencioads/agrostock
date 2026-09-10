import { describe, expect, it } from 'vitest';
import { splitPlace } from './place';

describe('splitPlace', () => {
  it('splits the city search value on its last comma', () => {
    expect(splitPlace('Mumbai, India')).toEqual({ city: 'Mumbai', country: 'India' });
    expect(splitPlace('Washington, D.C., United States')).toEqual({ city: 'Washington, D.C.', country: 'United States' });
  });

  it('treats a value with no comma as a bare city', () => {
    expect(splitPlace(' Amritsar ')).toEqual({ city: 'Amritsar', country: '' });
  });
});
