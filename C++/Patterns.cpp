#include <iostream>

using namespace std;

int main(){
    int i=0, j=0, k=0, l=0;
    for(i=1; i<8; i++){
        if(i <= 4){
            for(k=1; k<=(4-i); k++){
                printf(" ");
            }
            for(j=1; j<=i; j++){
                printf("* ");
                
            }
        }else{
            for(k=1; k<=(i-4); k++){
                printf(" ");
            }
            for(l=1; l<=8-i; l++){
                    printf("* ");
            }
        }
        printf("\n");
    }
}