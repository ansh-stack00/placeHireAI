import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://placehire.online',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://placehire.online/dashboard/board',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://placehire.online/dashboard/resumes',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    // add more routes as you build them
  ]
}