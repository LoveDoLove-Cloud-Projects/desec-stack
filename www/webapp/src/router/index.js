import VueRouter from 'vue-router'
import HomePage from '@/views/HomePage.vue'
import {HTTP} from '@/utils';
import {useUserStore} from "@/store/user";

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage
  },
  {
    path: '/signup/:email?',
    name: 'signup',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('@/views/SignUp.vue'),
  },
  {
    path: '/custom-setup/:domain',
    name: 'customSetup',
    component: () => import('@/views/DomainSetupPage.vue'),
    props: true,
  },
  {
    path: '/dyn-setup/:domain',
    alias: '/dynsetup/:domain',
    name: 'dynSetup',
    component: () => import('@/views/DynSetup.vue'),
  },
  {
    path: '/welcome/:domain?',
    name: 'welcome',
    component: () => import('@/views/WelcomePage.vue'),
  },
  {
    path: 'https://desec.readthedocs.io/',
    name: 'docs',
    beforeEnter(to) { location.href = to.path },
  },
  {
    path: 'https://talk.desec.io/',
    name: 'talk',
    beforeEnter(to) { location.href = to.path },
  },
  {
    path: '/confirm/:action/:code',
    name: 'confirmation',
    component: () => import('@/views/ConfirmationPage.vue')
  },
  {
    path: '/reset-password/:email?',
    name: 'reset-password',
    component: () => import('@/views/ResetPassword.vue'),
  },
  {
    path: '/totp/',
    name: 'totp',
    component: () => import('@/views/CrudListTOTP.vue'),
    meta: {guest: false},
  },
  {
    path: '/totp-verify/',
    name: 'TOTPVerify',
    component: () => import('@/views/Console/TOTPVerifyDialog.vue'),
    props: (route) => ({...route.params}),
  },
  {
    path: '/mfa/',
    name: 'mfa',
    component: () => import('@/views/MFA.vue'),
    meta: {guest: false},
  },
  {
    path: '/change-email/:email?',
    name: 'change-email',
    component: () => import('@/views/ChangeEmail.vue'),
    meta: {guest: false},
  },
  {
    path: '/delete-account/',
    name: 'delete-account',
    component: () => import('@/views/DeleteAccount.vue'),
    meta: {guest: false},
  },
  {
    path: '/donate/',
    name: 'donate',
    component: () => import('@/views/DonatePage.vue'),
  },
  {
    path: 'https://github.com/desec-io/desec-stack/milestones?direction=asc&sort=title&state=open',
    name: 'roadmap',
    beforeEnter(to) { location.href = to.path },
  },
  {
    path: '/impressum/',
    name: 'impressum',
    component: () => import('@/views/ImpressumPage.vue'),
  },
  {
    path: '/privacy-policy/',
    name: 'privacy-policy',
    component: () => import('@/views/PrivacyPolicy.vue'),
  },
  {
    path: '/terms/',
    name: 'terms',
    component: () => import('@/views/TermsPage.vue'),
  },
  {
    path: '/about/',
    name: 'about',
    component: () => import('@/views/AboutPage.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginPage.vue'),
  },
  {
    path: '/tokens',
    name: 'tokens',
    component: () => import('@/views/CrudListToken.vue'),
    meta: {guest: false},
  },
  {
    path: '/domains',
    name: 'domains',
    component: () => import('@/views/CrudListDomain.vue'),
    meta: {guest: false},
  },
  {
    path: '/domains/:domain',
    name: 'domain',
    component: () => import('@/views/CrudListRecord.vue'),
    meta: {guest: false},
  },
]

const router = new VueRouter({
  mode: 'history',
  base: import.meta.env.BASE_URL,
  scrollBehavior (to, from) {
    // Skip if destination full path has query parameters and differs in no other way from previous
    if (from && Object.keys(to.query).length) {
      if (to.fullPath.split('?')[0] == from.fullPath.split('?')[0]) return;
    }
    return { x: 0, y: 0 }
  },
  routes
})

router.beforeEach((to, from, next) => {
  // see if there are credentials in the session store that we don't know of
  let recovered = false;
  const user = useUserStore();
  if (sessionStorage.getItem('token') && !user.authenticated) {
    const token = JSON.parse(sessionStorage.getItem('token'));
    HTTP.defaults.headers.Authorization = 'Token ' + token.token;
    user.login(token);
    recovered = true
  }

  if (to.matched.some(record => 'guest' in record.meta && record.meta.guest === false)) {
    // this route requires auth, check if logged in
    // if not, redirect to login page.
    if (!user.authenticated) {
      next({
        name: 'login',
        query: { redirect: to.fullPath }
      })
    } else {
      next()
    }
  } else {
    if (user.authenticated) {
      // Log in state was present, but not needed for the current page
      if (recovered && to.name === 'home') {
        // User restored a previous session. If navigation to home, divert to home page for authorized users
        next({name: 'domains'})
      }
    }
    next() // make sure to always call next()!
  }
});

export default router
