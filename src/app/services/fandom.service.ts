import { HttpClient, HttpResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, forkJoin, fromEvent, map, mergeMap, of, take, tap } from "rxjs";

const fandomApiParseUrl = `https://starwars.fandom.com/api.php?action=parse&prop=text&origin=*&format=json`;

interface FandomParseResponse {
    parse: {
        pageid: number;
        text: { '*': string };
        title: string;
    }
}

@Injectable({
    providedIn: 'root'
})
export class FandomService {

    readonly defaultImage = 'https://findyourforces.com/wp-content/uploads/star_wars_dating_lightsabers.png';
    readonly proxyImageUrl = 'https://pixlr.com/proxy/?url=';//'https://demo.flyimg.io/upload/q_90/';//'';

    constructor(private http: HttpClient) {

    }

    fetchWikiaImage(pageName: string): Observable<string> {
        return this.http.get<FandomParseResponse>(`${fandomApiParseUrl}&page=${pageName.replace(/\s/g, '_')}`).pipe(
            mergeMap((response: FandomParseResponse) => {
                const fandomHtml = new DOMParser().parseFromString(response?.parse?.text['*'], 'text/html');
                const img = fandomHtml.querySelector('.pi-image-thumbnail') as HTMLImageElement;
                const redirectUrl = fandomHtml.querySelector('.redirectMsg a') as HTMLAnchorElement;
                
                return img ? of(`${this.proxyImageUrl}${img?.src}`) : 
                    (redirectUrl ? this.fetchWikiaImage(redirectUrl.href.replace(/(.+\/wiki\/)/, '')) : of(`${this.proxyImageUrl}${this.defaultImage}`));
            }),
            mergeMap((imageUrl) => fetch(imageUrl)),
            mergeMap((response) => response.blob()),
            map((response) =>  URL.createObjectURL(response))
        )
    }

}