import { Service } from '../../components/service.ts';

export const moto = new Service({
  image: 'public.ecr.aws/z2c7x8q5/motoserver:latest',
  env: { MOTO_PORT: '4566' },
  ports: {
    4566: 4566,
  },
  options: [
    '--health-cmd="/usr/bin/curl --fail http://127.0.0.1:4566"',
    '--health-interval 10s',
    '--health-timeout 5s',
    '--health-retries 5',
  ],
});
