import { ApplicationConfig, provideBrowserGlobalErrorListeners, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { ApolloLink, InMemoryCache } from '@apollo/client';
import { environment } from '../environments/environment';
import { authInterceptor } from './core/auth/auth-interceptor';
import { createErrorLink } from './core/graphql/error-link';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        authInterceptor
      ])
    ),
    provideApollo(() => {
      const httpLink = inject(HttpLink);

      return {
        link: ApolloLink.from([
          createErrorLink(),
          httpLink.create({ uri: environment.graphqlUrl }),
        ]),
        cache: new InMemoryCache(),
      };
    }),
  ],
};
