import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FeaturesComponent } from './features.component';
import { authGuard } from '../core/guards/auth.guard';
import { adminGuard } from '../core/guards/admin.guard';

const routes: Routes = [
  {
    path: '',
    component: FeaturesComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard-v1',
      },
      {
        path: 'course-detail',
        loadChildren: () =>
          import('./course-detail/course-detail.module').then(
            (m) => m.CourseDetailModule,
          ),
      },
      {
        path: 'my-courses',
        loadChildren: () =>
          import('./my-courses/my-courses.module').then(
            (m) => m.MyCoursesModule,
          ),
      },
      {
        path: 'recommended-courses',
        loadChildren: () =>
          import('./recommended-courses/recommended-courses.module').then(
            (m) => m.RecommendedCoursesModule,
          ),
      },
      {
        path: 'dashboard-v1',
        loadChildren: () =>
          import('./dashboard-v1/dashboard-v1.module').then(
            (m) => m.DashboardV1Module,
          ),
      },
      {
        path: 'assigned-course',
        canActivate: [adminGuard],
        loadChildren: () =>
          import('./assigned-course/assigned-course.module').then(
            (m) => m.AssignedCourseModule,
          ),
      },
      {
        path: 'dashboard-v2',
        canActivate: [adminGuard],
        loadChildren: () =>
          import('./dashboard-v2/dashboard-v2.module').then(
            (m) => m.DashboardV2Module,
          ),
      },
      {
        path: 'course-content',
        canActivate: [adminGuard],
        loadChildren: () =>
          import('./course-content/course-content.module').then(
            (m) => m.CourseContentModule,
          ),
      },
      {
        path: 'create-course',
        canActivate: [adminGuard],
        loadChildren: () =>
          import('./create-course/create-course.module').then(
            (m) => m.CreateCourseModule,
          ),
      },
      {
        path: 'courses',
        canActivate: [adminGuard],
        loadChildren: () =>
          import('./courses/courses.module').then((m) => m.CoursesModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class FeaturesRoutingModule {}
