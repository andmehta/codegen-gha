import { Service } from '../../components/service';

export const postgres = new Service({
  image: 'public.ecr.aws/docker/library/postgres:15-alpine',
  env: {
    POSTGRES_USER: 'postgres',
    POSTGRES_HOST_AUTH_METHOD: 'trust',
  },
  ports: {
    5432: 5432,
  },
  options: [
    '--health-cmd pg_isready',
    '--health-interval 10s',
    '--health-timeout 5s',
    '--health-retries 5',
  ],
});
