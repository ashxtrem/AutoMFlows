// Mock for @faker-js/faker to avoid ESM issues in Jest
// Returns functions that generate values, not jest.fn() mocks
export const faker = {
  person: {
    firstName: () => 'John',
    lastName: () => 'Doe',
    fullName: () => 'John Doe',
    email: () => 'john.doe@example.com',
  },
  internet: {
    email: () => 'test@example.com',
    url: () => 'https://example.com',
  },
  datatype: {
    uuid: () => '123e4567-e89b-12d3-a456-426614174000',
    number: () => 42,
    string: () => 'test-string',
    boolean: () => true,
  },
  lorem: {
    words: () => 'lorem ipsum dolor',
    sentence: () => 'Lorem ipsum dolor sit amet.',
  },
  date: {
    recent: () => new Date(),
    future: () => new Date(),
  },
  helpers: {
    arrayElement: (arr: any[]) => arr[0],
  },
};
