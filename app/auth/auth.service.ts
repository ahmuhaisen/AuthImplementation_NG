import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, throwError } from "rxjs";

interface AuthResponseData {
    kind: string;
    idToken: string;
    email: string;
    refreshToken: string;
    expiresIn: string;
    localId: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    signupUrl = 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyCq5apSnbrBKRVEb9fqaCL9r_UVEkAySjc';

    constructor(private httpClient: HttpClient) { }

    signup(email: string, password: string) {
        return this.httpClient
            .post<AuthResponseData>(this.signupUrl,
                {
                    email: email,
                    password: password,
                    returnSecureToken: true
                }
            )
            .pipe(catchError(errorRes => {
                let errorMessage = 'An unknown error occurred!';

                if (!errorRes.error || !errorRes.error.error) {
                    return throwError(() => new Error(errorMessage));
                }

                switch (errorRes.error.error.message) {
                    case 'EMAIL_EXISTS':
                        errorMessage = 'The email address is already in use by another account.';
                        break;
                    case 'OPERATION_NOT_ALLOWED':
                        errorMessage = 'Password sign-in is disabled for this project.';
                        break;
                    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
                        break;
                }

                return throwError(() => new Error(errorMessage));
            }));
    }


}