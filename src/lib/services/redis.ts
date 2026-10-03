import { Service } from '../../components/service.ts';

export const redis = new Service({
  image: 'public.ecr.aws/docker/library/redis:7-alpine',
  ports: { 6379: 6379 },
  env: {},
  options: [],
});
