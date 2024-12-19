#include <iostream>
#include <cstring>

using namespace std;

int main() {
    char mystr[] = "vicks aag hai";
    int length = strlen(mystr);
    bool processed[256] = {false};
    
    for (int i = 0; i < length; i++) {
        char temp = mystr[i];

        if(temp == ' ') continue;
        
        if (processed[temp]) {
            continue;
        }
        
        int count = 0;
        for (int j = 0; j < length; j++) {
            if (mystr[j] == temp) {
                count++;
            }
        }
        
        cout << temp << ": " << count << endl;
        processed[temp] = true;
    }

    return 0;
}
